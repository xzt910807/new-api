package dto

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

// 图生图回归：画布/Agnes 官方约定 /images/generations 携带
// extra_body.image 数组作为参考图，ImageRequest 必须原样透传该字段，
// 否则上游会把请求当纯文生图处理（参考图静默丢失）。
func TestImageRequestPreservesExtraBody(t *testing.T) {
	raw := []byte(`{
		"model": "agnes-image-2.1-flash",
		"prompt": "把参考图改成水彩风格",
		"size": "1024x1024",
		"extra_body": {"image": ["https://example.com/ref.png", "data:image/png;base64,AAAA"]}
	}`)

	var req ImageRequest
	require.NoError(t, req.UnmarshalJSON(raw))

	out, err := req.MarshalJSON()
	require.NoError(t, err)

	assert.Equal(t, "agnes-image-2.1-flash", gjson.GetBytes(out, "model").String())
	assert.Equal(t, "把参考图改成水彩风格", gjson.GetBytes(out, "prompt").String())
	images := gjson.GetBytes(out, "extra_body.image").Array()
	require.Len(t, images, 2)
	assert.Equal(t, "https://example.com/ref.png", images[0].String())
	assert.Equal(t, "data:image/png;base64,AAAA", images[1].String())
}

// 未声明的杂散字段依旧按设计被丢弃（Extra 不参与 Marshal），
// 防止未来有人误把 Extra 全量合并进上游请求。
func TestImageRequestDropsUnknownFields(t *testing.T) {
	raw := []byte(`{"model": "m", "prompt": "p", "some_unknown_field": {"a": 1}}`)

	var req ImageRequest
	require.NoError(t, req.UnmarshalJSON(raw))

	out, err := req.MarshalJSON()
	require.NoError(t, err)
	assert.False(t, gjson.GetBytes(out, "some_unknown_field").Exists())
}
