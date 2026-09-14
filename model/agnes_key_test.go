package model

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// model 包的 TestMain（task_cas_test.go）已初始化 :memory: SQLite；
// agnes_keys 表是运维手工维护的外部表，不注册全局 AutoMigrate，由本文件自建。
func setupAgnesKeysTest(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&AgnesKey{}))
	t.Cleanup(func() {
		DB.Exec("DELETE FROM agnes_keys")
	})
}

func agnesToday() string { return time.Now().Format("2006-01-02") }

func agnesYesterday() string {
	return time.Now().AddDate(0, 0, -1).Format("2006-01-02")
}

func insertAgnesKey(t *testing.T, key *AgnesKey) *AgnesKey {
	t.Helper()
	require.NoError(t, DB.Create(key).Error)
	return key
}

func loadAgnesKey(t *testing.T, id int) AgnesKey {
	t.Helper()
	var key AgnesKey
	require.NoError(t, DB.First(&key, id).Error)
	return key
}

func TestAgnesAcquireKeySelectsHighestPriority(t *testing.T) {
	setupAgnesKeysTest(t)
	insertAgnesKey(t, &AgnesKey{ApiKey: "low", Enabled: 1, Priority: 1, TextLimit: 10, LastResetDate: agnesToday()})
	insertAgnesKey(t, &AgnesKey{ApiKey: "high", Enabled: 1, Priority: 10, TextLimit: 10, LastResetDate: agnesToday()})
	insertAgnesKey(t, &AgnesKey{ApiKey: "mid", Enabled: 1, Priority: 5, TextLimit: 10, LastResetDate: agnesToday()})

	got, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, "high", got.ApiKey)

	// 高优先级耗尽后退到次优先级
	high := loadAgnesKey(t, got.Id)
	require.NoError(t, DB.Exec("UPDATE agnes_keys SET text_used = ? WHERE id = ?", high.TextLimit, got.Id).Error)

	got, err = AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, "mid", got.ApiKey)
}

func TestAgnesAcquireKeyTextExhaustedFallsToNextKey(t *testing.T) {
	setupAgnesKeysTest(t)
	keyA := insertAgnesKey(t, &AgnesKey{ApiKey: "a", Enabled: 1, Priority: 10, TextLimit: 2, LastResetDate: agnesToday()})
	insertAgnesKey(t, &AgnesKey{ApiKey: "b", Enabled: 1, Priority: 5, TextLimit: 1, LastResetDate: agnesToday()})

	for i := 0; i < 2; i++ {
		got, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
		require.NoError(t, err)
		assert.Equal(t, keyA.Id, got.Id)
	}
	reloaded := loadAgnesKey(t, keyA.Id)
	assert.Equal(t, 2, reloaded.TextUsed)
	assert.Equal(t, 2, reloaded.UsedCount)

	// a 已满 → 换到 b
	got, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, "b", got.ApiKey)

	// 全部耗尽
	_, err = AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.ErrorIs(t, err, errAgnesNoAvailableKey)
}

func TestAgnesAcquireKeyClampsCount(t *testing.T) {
	setupAgnesKeysTest(t)
	key := insertAgnesKey(t, &AgnesKey{ApiKey: "clamp", Enabled: 1, Priority: 1, TextLimit: 5, LastResetDate: agnesToday()})

	// count < 1 时按 1 次扣减
	got, err := AgnesAcquireKey(AgnesKeyKindText, 0, "")
	require.NoError(t, err)
	assert.Equal(t, key.Id, got.Id)
	reloaded := loadAgnesKey(t, key.Id)
	assert.Equal(t, 1, reloaded.TextUsed)
}

func TestAgnesAcquireKeyImageChargesByCount(t *testing.T) {
	setupAgnesKeysTest(t)
	key := insertAgnesKey(t, &AgnesKey{ApiKey: "img", Enabled: 1, Priority: 1, ImageLimit: 5, LastResetDate: agnesToday()})

	// 图片按 n 张计数：一次扣 3
	got, err := AgnesAcquireKey(AgnesKeyKindImage, 3, "")
	require.NoError(t, err)
	assert.Equal(t, key.Id, got.Id)
	reloaded := loadAgnesKey(t, key.Id)
	assert.Equal(t, 3, reloaded.ImageUsed)
	assert.Equal(t, 1, reloaded.UsedCount)

	// 3 + 3 > 5：同一 key 被原子拒绝，无其他候选 → 错误且用量不变
	_, err = AgnesAcquireKey(AgnesKeyKindImage, 3, "")
	require.ErrorIs(t, err, errAgnesNoAvailableKey)
	reloaded = loadAgnesKey(t, key.Id)
	assert.Equal(t, 3, reloaded.ImageUsed)

	// 3 + 2 = 5 恰好到达上限，允许
	got, err = AgnesAcquireKey(AgnesKeyKindImage, 2, "")
	require.NoError(t, err)
	assert.Equal(t, key.Id, got.Id)
	reloaded = loadAgnesKey(t, key.Id)
	assert.Equal(t, 5, reloaded.ImageUsed)
}

func TestAgnesAcquireKeyConcurrentAtomicIncrement(t *testing.T) {
	setupAgnesKeysTest(t)
	key := insertAgnesKey(t, &AgnesKey{ApiKey: "shared", Enabled: 1, Priority: 1, TextLimit: 10, LastResetDate: agnesToday()})

	const workers = 20
	var wg sync.WaitGroup
	successes := make(chan struct{}, workers)
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := AgnesAcquireKey(AgnesKeyKindText, 1, ""); err == nil {
				successes <- struct{}{}
			}
		}()
	}
	wg.Wait()
	close(successes)

	total := 0
	for range successes {
		total++
	}
	assert.Equal(t, 10, total, "exactly TextLimit acquisitions should win under concurrency")

	reloaded := loadAgnesKey(t, key.Id)
	assert.Equal(t, 10, reloaded.TextUsed, "usage must never exceed the limit")
	assert.Equal(t, 10, reloaded.UsedCount)
}

func TestAgnesResetDailyUsageLazyReset(t *testing.T) {
	setupAgnesKeysTest(t)
	stale := insertAgnesKey(t, &AgnesKey{
		ApiKey: "stale", Enabled: 1, Priority: 1, TextLimit: 10,
		TextUsed: 5, ImageUsed: 3, VideoUsed: 42.5, LastResetDate: agnesYesterday(),
	})
	fresh := insertAgnesKey(t, &AgnesKey{
		ApiKey: "fresh", Enabled: 1, Priority: 2, TextLimit: 10,
		TextUsed: 2, LastResetDate: agnesToday(),
	})

	require.NoError(t, AgnesResetDailyUsage(agnesToday()))

	reloaded := loadAgnesKey(t, stale.Id)
	assert.Zero(t, reloaded.TextUsed)
	assert.Zero(t, reloaded.ImageUsed)
	assert.InDelta(t, 0, reloaded.VideoUsed, 0.001)
	assert.Equal(t, agnesToday(), reloaded.LastResetDate)

	kept := loadAgnesKey(t, fresh.Id)
	assert.Equal(t, 2, kept.TextUsed, "today's usage must not be reset")

	// 幂等：last_reset_date 已是 today 时不再清零
	require.NoError(t, DB.Exec("UPDATE agnes_keys SET text_used = 4 WHERE id = ?", stale.Id).Error)
	require.NoError(t, AgnesResetDailyUsage(agnesToday()))
	reloaded = loadAgnesKey(t, stale.Id)
	assert.Equal(t, 4, reloaded.TextUsed)
}

func TestAgnesAcquireKeyTriggersLazyReset(t *testing.T) {
	setupAgnesKeysTest(t)
	// 昨日已用满的 key，今日首次选取时被惰性重置后重新可用
	key := insertAgnesKey(t, &AgnesKey{
		ApiKey: "stale-full", Enabled: 1, Priority: 1,
		TextLimit: 5, TextUsed: 5, LastResetDate: agnesYesterday(),
	})

	got, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, key.Id, got.Id)
	reloaded := loadAgnesKey(t, key.Id)
	assert.Equal(t, 1, reloaded.TextUsed, "usage resets then charges one request")
}

func TestAgnesAddAndRefundVideoSeconds(t *testing.T) {
	setupAgnesKeysTest(t)
	key := insertAgnesKey(t, &AgnesKey{
		ApiKey: "video", Enabled: 1, Priority: 1,
		VideoLimit: 500, VideoUsed: 100, LastResetDate: agnesToday(),
	})

	// 提交成功入账
	require.NoError(t, AgnesAddVideoSeconds(key.Id, 12.5))
	reloaded := loadAgnesKey(t, key.Id)
	assert.InDelta(t, 112.5, reloaded.VideoUsed, 0.001)
	assert.Equal(t, 1, reloaded.UsedCount)

	// 失败退回
	require.NoError(t, AgnesRefundVideoSeconds(key.Id, 2.5))
	reloaded = loadAgnesKey(t, key.Id)
	assert.InDelta(t, 110, reloaded.VideoUsed, 0.001)

	// 退回超额 → 钳制为 0
	require.NoError(t, AgnesRefundVideoSeconds(key.Id, 9999))
	reloaded = loadAgnesKey(t, key.Id)
	assert.InDelta(t, 0, reloaded.VideoUsed, 0.001)

	// 无效参数静默 no-op
	assert.NoError(t, AgnesAddVideoSeconds(0, 10))
	assert.NoError(t, AgnesAddVideoSeconds(key.Id, 0))
	assert.NoError(t, AgnesRefundVideoSeconds(0, 10))
	assert.NoError(t, AgnesRefundVideoSeconds(key.Id, 0))
}

func TestAgnesAcquireKeyVideoSelectsWithoutCharge(t *testing.T) {
	setupAgnesKeysTest(t)
	// video 只选不扣：秒数在任务提交成功后才入账，但会原子增加 used_count 标记占用。
	key := insertAgnesKey(t, &AgnesKey{
		ApiKey: "v", Enabled: 1, Priority: 3,
		VideoLimit: 500, VideoUsed: 499, LastResetDate: agnesToday(),
	})

	got, err := AgnesAcquireKey(AgnesKeyKindVideo, 0, "")
	require.NoError(t, err)
	assert.Equal(t, key.Id, got.Id)

	reloaded := loadAgnesKey(t, key.Id)
	assert.InDelta(t, 499, reloaded.VideoUsed, 0.001)
	assert.Equal(t, 1, reloaded.UsedCount)
}

func TestAgnesAcquireKeyLeastUsedBalancing(t *testing.T) {
	setupAgnesKeysTest(t)
	// 同优先级下，请求应分散到多个 key，而不是永远用第一个。
	keyA := insertAgnesKey(t, &AgnesKey{ApiKey: "a", Enabled: 1, Priority: 5, TextLimit: 10, LastResetDate: agnesToday()})
	keyB := insertAgnesKey(t, &AgnesKey{ApiKey: "b", Enabled: 1, Priority: 5, TextLimit: 10, LastResetDate: agnesToday()})
	keyC := insertAgnesKey(t, &AgnesKey{ApiKey: "c", Enabled: 1, Priority: 1, TextLimit: 10, LastResetDate: agnesToday()})

	got, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, keyA.Id, got.Id)

	got, err = AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, keyB.Id, got.Id)

	// 低优先级 key 在更高优先级 key 仍有配额时不应被选中
	got, err = AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.NoError(t, err)
	assert.Equal(t, keyA.Id, got.Id)
	assert.NotEqual(t, keyC.Id, got.Id)
}

func TestAgnesAcquireKeyBaseURLFilter(t *testing.T) {
	setupAgnesKeysTest(t)
	agnesURL := "https://api.agnes-ai.cn"
	otherURL := "https://other.example.com"
	insertAgnesKey(t, &AgnesKey{ApiKey: "generic", Enabled: 1, Priority: 1, TextLimit: 10, LastResetDate: agnesToday()}) // NULL base_url
	insertAgnesKey(t, &AgnesKey{ApiKey: "blank", Enabled: 1, Priority: 2, TextLimit: 10, BaseURL: agnesStrPtr(""), LastResetDate: agnesToday()})
	insertAgnesKey(t, &AgnesKey{ApiKey: "agnes", Enabled: 1, Priority: 5, TextLimit: 10, BaseURL: agnesStrPtr(agnesURL), LastResetDate: agnesToday()})
	insertAgnesKey(t, &AgnesKey{ApiKey: "other", Enabled: 1, Priority: 9, TextLimit: 10, BaseURL: agnesStrPtr(otherURL), LastResetDate: agnesToday()})

	// agnes 渠道：候选 generic/blank/agnes（NULL 与空串视为通用）
	got, err := AgnesAcquireKey(AgnesKeyKindText, 1, agnesURL)
	require.NoError(t, err)
	assert.Equal(t, "agnes", got.ApiKey)

	// other 渠道：候选 generic/blank/other
	got, err = AgnesAcquireKey(AgnesKeyKindText, 1, otherURL)
	require.NoError(t, err)
	assert.Equal(t, "other", got.ApiKey)

	// AgnesAnyEnabledKey 同样遵循 base_url 过滤
	keyStr, err := AgnesAnyEnabledKey(agnesURL)
	require.NoError(t, err)
	assert.Equal(t, "agnes", keyStr)
	keyStr, err = AgnesAnyEnabledKey(otherURL)
	require.NoError(t, err)
	assert.Equal(t, "other", keyStr)
}

func agnesStrPtr(s string) *string { return &s }

func TestAgnesAcquireKeyDisabledAndInvalidKind(t *testing.T) {
	setupAgnesKeysTest(t)
	insertAgnesKey(t, &AgnesKey{ApiKey: "off", Enabled: 0, Priority: 10, TextLimit: 10, LastResetDate: agnesToday()})

	// 禁用的 key 不会被选中
	_, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.ErrorIs(t, err, errAgnesNoAvailableKey)

	_, err = AgnesAnyEnabledKey("")
	require.ErrorIs(t, err, errAgnesNoAvailableKey)

	// 非法 kind 属于参数错误，而非配额耗尽
	_, err = AgnesAcquireKey("audio", 1, "")
	require.Error(t, err)
	assert.NotErrorIs(t, err, errAgnesNoAvailableKey)
}

func TestAgnesDisableKey(t *testing.T) {
	setupAgnesKeysTest(t)
	key := insertAgnesKey(t, &AgnesKey{ApiKey: "dead", Enabled: 1, Priority: 1, TextLimit: 10, LastResetDate: agnesToday()})

	// id=0 为静默 no-op
	assert.NoError(t, AgnesDisableKey(0))

	// 禁用后 enabled=0，且不再被选取
	require.NoError(t, AgnesDisableKey(key.Id))
	reloaded := loadAgnesKey(t, key.Id)
	assert.Equal(t, 0, reloaded.Enabled)

	_, err := AgnesAcquireKey(AgnesKeyKindText, 1, "")
	require.ErrorIs(t, err, errAgnesNoAvailableKey)

	// 重复禁用幂等：已禁用的行不受影响，也无错误
	require.NoError(t, AgnesDisableKey(key.Id))
	reloaded = loadAgnesKey(t, key.Id)
	assert.Equal(t, 0, reloaded.Enabled)
}
