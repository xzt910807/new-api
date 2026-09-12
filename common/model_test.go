package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsImageGenerationModel(t *testing.T) {
	cases := []struct {
		name      string
		modelName string
		expected  bool
	}{
		{"dall-e-3", "dall-e-3", true},
		{"gpt-image-1", "gpt-image-1", true},
		{"imagen prefix", "imagen-4.0-generate-001", true},
		{"flux prefix", "flux-1.1-pro", true},
		{"agnes-image prefix", "agnes-image-2.1-flash", true},
		{"agnes-image case-insensitive", "AGNES-Image-2.1-Flash", true},
		{"chat model", "gpt-4o-mini", false},
		{"agnes video model", "agnes-video-v2.0", false},
		{"embedding model", "text-embedding-3-small", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assert.Equal(t, c.expected, IsImageGenerationModel(c.modelName))
		})
	}
}
