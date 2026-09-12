package controller

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/types"

	"github.com/gin-gonic/gin"
)

func Playground(c *gin.Context) {
	var newAPIError *types.NewAPIError

	defer func() {
		if newAPIError != nil {
			c.JSON(newAPIError.StatusCode, gin.H{
				"error": newAPIError.ToOpenAIError(),
			})
		}
	}()

	useAccessToken := c.GetBool("use_access_token")
	if useAccessToken {
		newAPIError = types.NewError(errors.New("暂不支持使用 access token"), types.ErrorCodeAccessDenied, types.ErrOptionWithSkipRetry())
		return
	}

	relayInfo, err := relaycommon.GenRelayInfo(c, types.RelayFormatOpenAI, nil, nil)
	if err != nil {
		newAPIError = types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
		return
	}

	userId := c.GetInt("id")

	// Write user context to ensure acceptUnsetRatio is available
	userCache, err := model.GetUserCache(userId)
	if err != nil {
		newAPIError = types.NewError(err, types.ErrorCodeQueryDataError, types.ErrOptionWithSkipRetry())
		return
	}
	userCache.WriteContext(c)

	tempToken := &model.Token{
		UserId: userId,
		Name:   fmt.Sprintf("playground-%s", relayInfo.UsingGroup),
		Group:  relayInfo.UsingGroup,
	}
	_ = middleware.SetupContextForToken(c, tempToken)

	Relay(c, types.RelayFormatOpenAI)
}

// PlaygroundTask handles task submissions from the playground UI using session
// authentication. It creates a temporary token (like Playground does for chat)
// and then delegates to the standard task relay flow.
func PlaygroundTask(c *gin.Context) {
	useAccessToken := c.GetBool("use_access_token")
	if useAccessToken {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"message": "暂不支持使用 access token",
				"type":    "access_denied",
				"code":    "access_denied",
			},
		})
		return
	}

	userId := c.GetInt("id")
	userCache, err := model.GetUserCache(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "Failed to load user",
				"type":    "server_error",
				"code":    "load_user_failed",
			},
		})
		return
	}
	userCache.WriteContext(c)

	usingGroup := c.GetString(string(constant.ContextKeyUsingGroup))
	if usingGroup == "" {
		usingGroup = "default"
	}

	tempToken := &model.Token{
		UserId: userId,
		Name:   fmt.Sprintf("playground-task-%s", usingGroup),
		Group:  usingGroup,
	}
	_ = middleware.SetupContextForToken(c, tempToken)

	RelayTask(c)
}
