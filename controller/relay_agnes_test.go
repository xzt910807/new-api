package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func agnesChargeContext(body string) *gin.Context {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", strings.NewReader(body))
	return c
}

func TestAgnesVideoSecondsForChargePrefersSnapshotFacts(t *testing.T) {
	// 快照 usage facts 优先；body 里的 num_frames 不参与
	c := agnesChargeContext(`{"num_frames":9999}`)
	info := &relaycommon.RelayInfo{
		TieredBillingSnapshot: &billingexpr.BillingSnapshot{
			UsageFacts: map[string]any{"seconds": 12.5},
		},
	}
	assert.InDelta(t, 12.5, agnesVideoSecondsForCharge(c, info), 0.001)
}

func TestAgnesVideoSecondsForChargeFallsBackToBody(t *testing.T) {
	// 快照缺失时回退解析请求体 num_frames / frame_rate
	c := agnesChargeContext(`{"num_frames":240,"frame_rate":24}`)
	assert.InDelta(t, 10, agnesVideoSecondsForCharge(c, &relaycommon.RelayInfo{}), 0.001)

	// 帧率缺省 24
	c2 := agnesChargeContext(`{"num_frames":240}`)
	assert.InDelta(t, 10, agnesVideoSecondsForCharge(c2, &relaycommon.RelayInfo{}), 0.001)
}

func TestAgnesVideoSecondsForChargeClampsAndInvalidInputs(t *testing.T) {
	// snapshot 秒数超出上界 → clamp 3600
	c := agnesChargeContext(`{}`)
	info := &relaycommon.RelayInfo{
		TieredBillingSnapshot: &billingexpr.BillingSnapshot{
			UsageFacts: map[string]any{"seconds": 999999.0},
		},
	}
	assert.InDelta(t, 3600, agnesVideoSecondsForCharge(c, info), 0.001)

	// body 秒数不足下界 → clamp 1（12 帧 / 24 = 0.5s）
	c2 := agnesChargeContext(`{"num_frames":12,"frame_rate":24}`)
	assert.InDelta(t, 1, agnesVideoSecondsForCharge(c2, &relaycommon.RelayInfo{}), 0.001)

	// 无任何有效信息 → 0（跳过入账）
	c3 := agnesChargeContext(`{}`)
	assert.Zero(t, agnesVideoSecondsForCharge(c3, &relaycommon.RelayInfo{}))

	// 非 JSON 请求体 → 0
	c4 := agnesChargeContext(`not-json`)
	assert.Zero(t, agnesVideoSecondsForCharge(c4, &relaycommon.RelayInfo{}))

	// facts seconds 非正 → 回退 body（48/24 = 2s）
	c5 := agnesChargeContext(`{"num_frames":48,"frame_rate":24}`)
	info5 := &relaycommon.RelayInfo{
		TieredBillingSnapshot: &billingexpr.BillingSnapshot{
			UsageFacts: map[string]any{"seconds": 0.0},
		},
	}
	assert.InDelta(t, 2, agnesVideoSecondsForCharge(c5, info5), 0.001)
}

func TestClampAgnesSeconds(t *testing.T) {
	assert.Zero(t, clampAgnesSeconds(0))
	assert.Zero(t, clampAgnesSeconds(-5))
	assert.InDelta(t, 1, clampAgnesSeconds(0.3), 0.001)
	assert.InDelta(t, 1, clampAgnesSeconds(1), 0.001)
	assert.InDelta(t, 300, clampAgnesSeconds(300), 0.001)
	assert.InDelta(t, 3600, clampAgnesSeconds(3600), 0.001)
	assert.InDelta(t, 3600, clampAgnesSeconds(5000), 0.001)
}

func TestAgnesKeyMetaFromContext(t *testing.T) {
	c := agnesChargeContext(`{}`)
	assert.Nil(t, agnesKeyMetaFromContext(c)) // 未设置

	c.Set(string(constant.ContextKeyAgnesKeyMeta), "wrong-type")
	assert.Nil(t, agnesKeyMetaFromContext(c)) // 类型不符

	meta := &model.AgnesKey{Id: 7, ApiKey: "sk-agnes"}
	c.Set(string(constant.ContextKeyAgnesKeyMeta), meta)
	got := agnesKeyMetaFromContext(c)
	require.NotNil(t, got)
	assert.Equal(t, 7, got.Id)
	assert.Equal(t, "sk-agnes", got.ApiKey)
}

func TestAgnesRefundVideoSecondsForTaskGuards(t *testing.T) {
	// 守卫分支直接返回，不触碰数据库
	task := &model.Task{}
	agnesRefundVideoSecondsForTask(task) // AgnesKeyID == 0
	assert.Zero(t, task.PrivateData.AgnesKeyID)

	task2 := &model.Task{}
	task2.PrivateData.AgnesKeyID = 5
	task2.PrivateData.AgnesKeySeconds = 0 // seconds == 0 守卫
	agnesRefundVideoSecondsForTask(task2)
	assert.Equal(t, 5, task2.PrivateData.AgnesKeyID)
	assert.Zero(t, task2.PrivateData.AgnesKeySeconds)
}
