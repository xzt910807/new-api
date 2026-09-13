package controller

import (
	"fmt"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// 锁定邮件模板的品牌要素与格式串替换契约，防止 fmt verb 错位导致线上邮件出现 %d / %! 残留。
func TestEmailTemplateBodyFormat(t *testing.T) {
	ver := buildVerificationEmailBody("123456", 10)
	require.Contains(t, ver, "AI WTS")
	require.Contains(t, ver, "123456")
	require.Contains(t, ver, "验证码 10 分钟内有效")
	require.Contains(t, ver, fmt.Sprintf("&copy; %d AI WTS", time.Now().Year()))
	require.Contains(t, ver, `bgcolor="#2563eb"`)
	// 不允许出现未替换的 fmt verb 残留
	for _, leftover := range []string{"%d", "%s", "%!", "%%"} {
		assert.NotContains(t, ver, leftover)
	}

	reset := buildPasswordResetEmailBody("https://example.com/user/reset?token=abc", 10)
	require.Contains(t, reset, "AI WTS")
	require.Contains(t, reset, `href="https://example.com/user/reset?token=abc"`)
	require.Contains(t, reset, "重置链接 10 分钟内有效")
	require.Contains(t, reset, fmt.Sprintf("&copy; %d AI WTS", time.Now().Year()))
	for _, leftover := range []string{"%d", "%s", "%!", "%%"} {
		assert.NotContains(t, reset, leftover)
	}
}

func TestGenerateNumericVerificationCode(t *testing.T) {
	for i := 0; i < 100; i++ {
		code := common.GenerateNumericVerificationCode(6)
		require.Len(t, code, 6)
		for _, ch := range code {
			assert.True(t, ch >= '0' && ch <= '9', "code %q must be numeric", code)
		}
	}
}
