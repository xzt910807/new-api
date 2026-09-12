package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupCanvasSSOTestDB(t *testing.T) {
	t.Helper()
	db := openTokenControllerTestDB(t)
	migrateTokenControllerTestDB(t, db)
}

func TestGetOrCreateCanvasSSOToken(t *testing.T) {
	setupCanvasSSOTestDB(t)

	t.Run("creates the dedicated token on first use", func(t *testing.T) {
		key, err := getOrCreateCanvasSSOToken(42)
		require.NoError(t, err)
		assert.True(t, strings.HasPrefix(key, "sk-"), key)
		rawKey := strings.TrimPrefix(key, "sk-")
		assert.Len(t, rawKey, 48)

		token, err := model.GetUserTokenByName(42, canvasSSOTokenName)
		require.NoError(t, err)
		assert.Equal(t, rawKey, token.Key)
		assert.Equal(t, common.TokenStatusEnabled, token.Status)
		assert.True(t, token.UnlimitedQuota)
		assert.Equal(t, int64(-1), token.ExpiredTime)
		assert.Zero(t, token.RemainQuota)
		assert.NotZero(t, token.CreatedTime)
	})

	t.Run("reuses the existing enabled token", func(t *testing.T) {
		seeded := seedToken(t, model.DB, 7, canvasSSOTokenName, "existing-key-0000000000000000000000")
		key, err := getOrCreateCanvasSSOToken(7)
		require.NoError(t, err)
		assert.Equal(t, "sk-"+seeded.Key, key)

		total, err := model.CountUserTokens(7)
		require.NoError(t, err)
		assert.Equal(t, int64(1), total, "must not create a duplicate token")
	})

	t.Run("re-enables a disabled token instead of creating a new one", func(t *testing.T) {
		seeded := seedToken(t, model.DB, 8, canvasSSOTokenName, "disabled-key-000000000000000000000")
		seeded.Status = common.TokenStatusDisabled
		require.NoError(t, model.DB.Model(seeded).Select("status").Update("status", common.TokenStatusDisabled).Error)

		key, err := getOrCreateCanvasSSOToken(8)
		require.NoError(t, err)
		assert.Equal(t, "sk-"+seeded.Key, key)

		token, err := model.GetUserTokenByName(8, canvasSSOTokenName)
		require.NoError(t, err)
		assert.Equal(t, common.TokenStatusEnabled, token.Status)
		total, err := model.CountUserTokens(8)
		require.NoError(t, err)
		assert.Equal(t, int64(1), total)
	})

	t.Run("enforces the per-user token limit", func(t *testing.T) {
		setting := operation_setting.GetTokenSetting()
		original := setting.MaxUserTokens
		setting.MaxUserTokens = 0
		t.Cleanup(func() { setting.MaxUserTokens = original })

		_, err := getOrCreateCanvasSSOToken(9)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "已达到最大令牌数量限制")
	})
}

func TestCanvasSSOClaimsCarryApiToken(t *testing.T) {
	setupCanvasSSOTestDB(t)

	originalSecret := common.CanvasSSOSecret
	originalBaseURL := common.CanvasBaseURL
	common.CanvasSSOSecret = "test-sso-secret"
	common.CanvasBaseURL = "https://canvas.example"
	t.Cleanup(func() {
		common.CanvasSSOSecret = originalSecret
		common.CanvasBaseURL = originalBaseURL
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/user/canvas-sso", nil)
	ctx.Set("id", 11)
	ctx.Set("username", "alice")

	CanvasSSO(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var response struct {
		Success bool `json:"success"`
		Data    struct {
			RedirectURL string `json:"redirect_url"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	require.True(t, response.Success)

	_, tokenString, found := strings.Cut(response.Data.RedirectURL, "token=")
	require.True(t, found)

	claims := &canvasSSOClaims{}
	parsed, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		return []byte("test-sso-secret"), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(canvasSSOIssuer), jwt.WithAudience(canvasSSOAudience))
	require.NoError(t, err)
	require.True(t, parsed.Valid)
	assert.Equal(t, "alice", claims.Username)
	assert.True(t, strings.HasPrefix(claims.ApiToken, "sk-"), claims.ApiToken)

	token, err := model.GetUserTokenByName(11, canvasSSOTokenName)
	require.NoError(t, err)
	assert.Equal(t, "sk-"+token.Key, claims.ApiToken)
}

// SSO token 必须携带用户的 bcrypt 密码哈希，无限画布据此把本地密码
// 与 new-api 保持一致（两边同为 bcrypt DefaultCost，哈希可直接互通）。
func TestCanvasSSOClaimsCarryPasswordHash(t *testing.T) {
	setupCanvasSSOTestDB(t)
	require.NoError(t, model.DB.AutoMigrate(&model.User{}))

	hash, err := common.Password2Hash("alice-password")
	require.NoError(t, err)
	require.NoError(t, model.DB.Create(&model.User{
		Id:       11,
		Username: "alice",
		Password: hash,
		Email:    "alice@example.com",
	}).Error)

	originalSecret := common.CanvasSSOSecret
	originalBaseURL := common.CanvasBaseURL
	common.CanvasSSOSecret = "test-sso-secret"
	common.CanvasBaseURL = "https://canvas.example"
	t.Cleanup(func() {
		common.CanvasSSOSecret = originalSecret
		common.CanvasBaseURL = originalBaseURL
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/user/canvas-sso", nil)
	ctx.Set("id", 11)
	ctx.Set("username", "alice")

	CanvasSSO(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var response struct {
		Success bool `json:"success"`
		Data    struct {
			RedirectURL string `json:"redirect_url"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	require.True(t, response.Success)

	_, tokenString, found := strings.Cut(response.Data.RedirectURL, "token=")
	require.True(t, found)

	claims := &canvasSSOClaims{}
	parsed, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		return []byte("test-sso-secret"), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(canvasSSOIssuer), jwt.WithAudience(canvasSSOAudience))
	require.NoError(t, err)
	require.True(t, parsed.Valid)
	assert.Equal(t, "alice", claims.Username)
	assert.Equal(t, hash, claims.PasswordHash)
	assert.Equal(t, "alice@example.com", claims.Email)
}
