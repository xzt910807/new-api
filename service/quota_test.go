package service

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"

	"github.com/stretchr/testify/require"
)

// 管理端内部调用（如渠道测试按钮触发的任务提交）没有令牌上下文，
// 令牌维度必须整体跳过，而不是对 id=0 的更新误报 "token quota is not enough"。
func TestPreConsumeTokenQuotaSkipsWithoutTokenContext(t *testing.T) {
	truncate(t)

	info := &relaycommon.RelayInfo{UserId: 1, TokenId: 0, TokenKey: ""}

	require.NoError(t, PreConsumeTokenQuota(info, 600000))
}

func TestPreConsumeTokenQuotaReservesAndRejectsRealTokens(t *testing.T) {
	truncate(t)
	seedUser(t, 1, 1000000)
	seedToken(t, 5, 1, "sk-quota-test", 500)

	sufficient := &relaycommon.RelayInfo{UserId: 1, TokenId: 5, TokenKey: "sk-quota-test"}
	require.NoError(t, PreConsumeTokenQuota(sufficient, 300))
	token, err := model.GetTokenById(5)
	require.NoError(t, err)
	require.Equal(t, 200, token.RemainQuota)

	insufficient := &relaycommon.RelayInfo{UserId: 1, TokenId: 5, TokenKey: "sk-quota-test"}
	err = PreConsumeTokenQuota(insufficient, 300)
	require.ErrorContains(t, err, "token quota is not enough")
}
