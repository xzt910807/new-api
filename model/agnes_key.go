package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// AgnesKey 映射运维手工维护的 agnes_keys 表（沿用 proxy.py 时代的密钥池结构）。
// new-api 只读写用量列（*_used / used_count / last_reset_date），其余列
// （api_key、限额、priority、enabled、base_url）由管理员手工维护。
type AgnesKey struct {
	Id            int     `json:"id"`
	ApiKey        string  `json:"api_key"`
	BaseURL       *string `json:"base_url"`
	Enabled       int     `json:"enabled"`
	Priority      int     `json:"priority"`
	TextLimit     int     `json:"text_limit"`
	ImageLimit    int     `json:"image_limit"`
	VideoLimit    float64 `json:"video_limit"`
	TextUsed      int     `json:"text_used"`
	ImageUsed     int     `json:"image_used"`
	VideoUsed     float64 `json:"video_used"`
	LastResetDate string  `json:"last_reset_date"`
	UsedCount     int     `json:"used_count"`
}

func (AgnesKey) TableName() string { return "agnes_keys" }

// agnes 支持的三类配额：按请求路径归类到对应用量列。
const (
	AgnesKeyKindText  = "text"
	AgnesKeyKindImage = "image"
	AgnesKeyKindVideo = "video"
)

type agnesQuotaColumns struct {
	used  string
	limit string
}

// 列名均为固定常量，kind 经白名单映射，避免任何拼接注入面。
var agnesQuotaColumnByKind = map[string]agnesQuotaColumns{
	AgnesKeyKindText:  {used: "text_used", limit: "text_limit"},
	AgnesKeyKindImage: {used: "image_used", limit: "image_limit"},
	AgnesKeyKindVideo: {used: "video_used", limit: "video_limit"},
}

var errAgnesNoAvailableKey = errors.New("AgnesAI 密钥配额已耗尽或全部禁用")

// AgnesResetDailyUsage 惰性每日重置：仅当记录的 last_reset_date 早于 today 时清零用量。
// today 由 Go 侧格式化（YYYY-MM-DD）传入，不依赖数据库 CURDATE()，日期字符串的
// 字典序与时间序一致，MySQL DATE 与 SQLite TEXT 均可直接比较。
func AgnesResetDailyUsage(today string) error {
	return DB.Exec(
		"UPDATE agnes_keys SET text_used = 0, image_used = 0, video_used = 0, last_reset_date = ? "+
			"WHERE last_reset_date < ? AND enabled = 1",
		today, today,
	).Error
}

// agnesBaseURLFilter 返回 base_url 的匹配条件：空/NULL 视为通用 key，可与任意渠道匹配。
func agnesBaseURLFilter() string {
	return "(base_url IS NULL OR base_url = '' OR base_url = ?)"
}

// AgnesAcquireKey 按配额类别选取一个可用 key：
//   - text/image：候选按 priority 降序、同优先级内按已用量 least-used 排序，
//     逐个原子递增（used + count <= limit），抢到即返回；
//   - video：只选不扣——秒数在任务提交成功后才入账（AgnesAddVideoSeconds），
//     但选择时会原子增加 used_count 标记占用，使并发视频请求分散到多个 key。
//
// 每次调用前先做惰性每日重置。
func AgnesAcquireKey(kind string, count int, baseURL string) (*AgnesKey, error) {
	columns, ok := agnesQuotaColumnByKind[kind]
	if !ok {
		return nil, errors.New("agnes key kind 无效: " + kind)
	}
	today := time.Now().Format("2006-01-02")
	if err := AgnesResetDailyUsage(today); err != nil {
		return nil, err
	}

	if count < 1 {
		count = 1
	}

	// 同优先级内按当前 kind 已用量、总使用次数升序，实现 least-used 负载均衡，
	// 避免所有并发请求都打到同一个高优先级 key。
	var candidates []*AgnesKey
	query := DB.Where("enabled = 1 AND "+columns.used+" < "+columns.limit+" AND "+agnesBaseURLFilter(), baseURL).
		Order("priority DESC, " + columns.used + " ASC, used_count ASC, id ASC").Limit(20)
	if err := query.Find(&candidates).Error; err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, errAgnesNoAvailableKey
	}

	for _, candidate := range candidates {
		var result *gorm.DB
		if kind == AgnesKeyKindVideo {
			// video 只选不扣，秒数提交成功后再入账；
			// 原子增加 used_count 标记本次选择，使并发视频请求尽量分散。
			result = DB.Exec(
				"UPDATE agnes_keys SET used_count = used_count + 1 "+
					"WHERE id = ? AND enabled = 1 AND "+columns.used+" < "+columns.limit,
				candidate.Id,
			)
		} else {
			// text/image：扣减次数（图片按张数 count，文本恒为 1）。原子 UPDATE + RowsAffected
			// 保证并发下不会越过限额；被并发抢空的候选继续尝试下一个。
			result = DB.Exec(
				"UPDATE agnes_keys SET "+columns.used+" = "+columns.used+" + ?, used_count = used_count + 1 "+
					"WHERE id = ? AND enabled = 1 AND "+columns.used+" + ? <= "+columns.limit,
				count, candidate.Id, count,
			)
		}
		if result.Error != nil {
			return nil, result.Error
		}
		if result.RowsAffected == 1 {
			return candidate, nil
		}
	}
	return nil, errAgnesNoAvailableKey
}

// AgnesAddVideoSeconds 视频任务提交成功后按请求秒数入账。
func AgnesAddVideoSeconds(id int, seconds float64) error {
	if id == 0 || seconds <= 0 {
		return nil
	}
	return DB.Exec(
		"UPDATE agnes_keys SET video_used = video_used + ?, used_count = used_count + 1 WHERE id = ?",
		seconds, id,
	).Error
}

// AgnesRefundVideoSeconds 视频任务失败时退回秒数，下限钳制为 0
// （CASE 写法兼容 MySQL 与 SQLite，两者都没有统一的 GREATEST 语义）。
func AgnesRefundVideoSeconds(id int, seconds float64) error {
	if id == 0 || seconds <= 0 {
		return nil
	}
	return DB.Exec(
		"UPDATE agnes_keys SET video_used = CASE WHEN video_used - ? > 0 THEN video_used - ? ELSE 0 END WHERE id = ?",
		seconds, seconds, id,
	).Error
}

// AgnesDisableKey 将池内指定密钥置为禁用（enabled=0），供上游 401/403
// 失效反馈自动触发；只影响当前启用中的行，重复调用幂等。
func AgnesDisableKey(id int) error {
	if id == 0 {
		return nil
	}
	return DB.Exec(
		"UPDATE agnes_keys SET enabled = 0 WHERE id = ? AND enabled = 1",
		id,
	).Error
}

// AgnesAnyEnabledKey 轮询兜底：任务缺少存储 key 时取任意启用密钥（优先高 priority）。
func AgnesAnyEnabledKey(baseURL string) (string, error) {
	var key AgnesKey
	err := DB.Where("enabled = 1 AND "+agnesBaseURLFilter(), baseURL).
		Order("priority DESC, id ASC").First(&key).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errAgnesNoAvailableKey
		}
		return "", err
	}
	return key.ApiKey, nil
}
