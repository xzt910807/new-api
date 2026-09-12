package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	canvasSSOTokenTTL = 60 * time.Second
	canvasSSOIssuer   = "new-api"
	canvasSSOAudience = "infinite-canvas"

	// canvasSSOTokenName is the name of the dedicated API token handed to
	// infinite-canvas so canvas-side requests are billed to this new-api user.
	canvasSSOTokenName = "canvas-sso"
)

// canvasSSOClaims defines the JWT claims sent to infinite-canvas during SSO.
type canvasSSOClaims struct {
	Username     string `json:"username"`
	Email        string `json:"email"`
	DisplayName  string `json:"display_name"`
	PasswordHash string `json:"password_hash,omitempty"`
	ApiToken     string `json:"api_token,omitempty"`
	jwt.RegisteredClaims
}

// CanvasSSO generates a short-lived SSO token and returns the infinite-canvas
// SSO callback URL. The endpoint is consumed by the frontend via XHR (with the
// Authorization header), because a plain browser navigation cannot carry the
// dashboard access token.
func CanvasSSO(c *gin.Context) {
	if common.CanvasSSOSecret == "" || common.CanvasBaseURL == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "Canvas SSO is not configured",
		})
		return
	}

	userId := c.GetInt("id")
	username := c.GetString("username")
	if userId <= 0 || username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "authentication required",
		})
		return
	}

	// Load full user record for email, display name, and password hash. The
	// hash travels inside the short-lived signed JWT so infinite-canvas can
	// keep its local password in sync with new-api (both use bcrypt).
	email := ""
	displayName := ""
	passwordHash := ""
	if user, err := getUserBasicInfo(userId); err == nil {
		email = user.Email
		displayName = user.DisplayName
		passwordHash = user.Password
	}
	if displayName == "" {
		displayName = username
	}

	// Hand the user's dedicated API token to canvas so its upstream calls are
	// billed to this new-api account.
	apiToken, err := getOrCreateCanvasSSOToken(userId)
	if err != nil {
		common.SysError("failed to prepare canvas SSO token for user " + username + ": " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "failed to prepare canvas API token: " + err.Error(),
		})
		return
	}

	now := time.Now()
	claims := canvasSSOClaims{
		Username:     username,
		Email:        email,
		DisplayName:  displayName,
		PasswordHash: passwordHash,
		ApiToken:     apiToken,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    canvasSSOIssuer,
			Subject:   strconv.Itoa(userId),
			Audience:  jwt.ClaimStrings{canvasSSOAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(canvasSSOTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}

	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(common.CanvasSSOSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "failed to generate SSO token",
		})
		return
	}

	redirectURL := common.CanvasBaseURL + "/api/auth/sso/callback?token=" + token
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"redirect_url": redirectURL,
		},
	})
}

// userBasicInfo is a lightweight struct for SSO token generation only.
type userBasicInfo struct {
	Email       string
	DisplayName string
	Password    string
}

func getUserBasicInfo(userId int) (*userBasicInfo, error) {
	var row struct {
		Email       string `gorm:"column:email"`
		DisplayName string `gorm:"column:display_name"`
		Password    string `gorm:"column:password"`
	}
	err := model.DB.Table("users").Select("email, display_name, password").Where("id = ?", userId).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	return &userBasicInfo{Email: row.Email, DisplayName: row.DisplayName, Password: row.Password}, nil
}

// getOrCreateCanvasSSOToken returns the user's dedicated "canvas-sso" API key
// (with the sk- prefix), creating it on first use. The token carries unlimited
// quota so usage is always billed to the user's account balance in new-api.
func getOrCreateCanvasSSOToken(userId int) (string, error) {
	if token, err := model.GetUserTokenByName(userId, canvasSSOTokenName); err == nil {
		if token.Status == common.TokenStatusEnabled {
			return "sk-" + token.Key, nil
		}
		// The dedicated token exists but was disabled; re-enable it so the
		// canvas link keeps working after every SSO login.
		token.AccessedTime = common.GetTimestamp()
		token.Status = common.TokenStatusEnabled
		if err := token.SelectUpdate(); err != nil {
			return "", err
		}
		return "sk-" + token.Key, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}

	// Not found yet: enforce the per-user token limit before creating.
	maxTokens := operation_setting.GetMaxUserTokens()
	count, err := model.CountUserTokens(userId)
	if err != nil {
		return "", err
	}
	if int(count) >= maxTokens {
		return "", fmt.Errorf("已达到最大令牌数量限制 (%d)，请删除部分令牌后重试", maxTokens)
	}
	key, err := common.GenerateKey()
	if err != nil {
		return "", err
	}
	token := model.Token{
		UserId:         userId,
		Name:           canvasSSOTokenName,
		Key:            key,
		Status:         common.TokenStatusEnabled,
		CreatedTime:    common.GetTimestamp(),
		AccessedTime:   common.GetTimestamp(),
		ExpiredTime:    -1,
		RemainQuota:    0,
		UnlimitedQuota: true,
	}
	if err := token.Insert(); err != nil {
		return "", err
	}
	return "sk-" + key, nil
}
