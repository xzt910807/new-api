package relay

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
)

func TestTaskModel2DtoNormalizesLegacyAction(t *testing.T) {
	task := &model.Task{Action: "firstTailGenerate"}

	dtoTask := TaskModel2Dto(task)

	assert.Equal(t, constant.TaskActionFirstTailToVideo, dtoTask.Action)
	assert.Equal(t, "firstTailGenerate", task.Action)
}

func TestResolutionBucketFromDimensions(t *testing.T) {
	cases := []struct {
		name          string
		width, height int
		want          string
	}{
		{"landscape 720p", 1280, 720, "720p"},
		{"portrait 720p short edge rules", 720, 1280, "720p"},
		{"square 480p", 480, 480, "480p"},
		{"small 360p clamps to 480p bucket", 640, 360, "480p"},
		{"1080p landscape", 1920, 1080, "1080p"},
		{"4k clamps to 1080p bucket", 3840, 2160, "1080p"},
		{"zero width", 0, 720, ""},
		{"zero height", 1280, 0, ""},
		{"negative", -10, 720, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, resolutionBucketFromDimensions(tc.width, tc.height))
		})
	}
}
