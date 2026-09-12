package setting

import (
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

const MembershipFreeModelsOptionKey = "MembershipFreeModels"

var (
	membershipFreeModelsMap  = make(map[string]bool)
	membershipFreeModelsLock sync.RWMutex
)

// LoadMembershipFreeModels parses and stores the membership-free model map.
// The input is expected to be a JSON object mapping model name -> bool.
func LoadMembershipFreeModels(jsonStr string) error {
	var parsed map[string]bool
	if strings.TrimSpace(jsonStr) == "" {
		parsed = make(map[string]bool)
	} else {
		if err := common.UnmarshalJsonStr(jsonStr, &parsed); err != nil {
			return err
		}
	}

	membershipFreeModelsLock.Lock()
	membershipFreeModelsMap = parsed
	membershipFreeModelsLock.Unlock()
	return nil
}

// IsModelMembershipFree reports whether the given model is free for active members.
func IsModelMembershipFree(modelName string) bool {
	if modelName == "" {
		return false
	}
	modelName = ratio_setting.FormatMatchingModelName(modelName)

	membershipFreeModelsLock.RLock()
	defer membershipFreeModelsLock.RUnlock()
	if free, ok := membershipFreeModelsMap[modelName]; ok {
		return free
	}
	return false
}

// MembershipFreeModels2JSONString returns the current membership-free model map as JSON.
func MembershipFreeModels2JSONString() string {
	membershipFreeModelsLock.RLock()
	defer membershipFreeModelsLock.RUnlock()
	jsonBytes, err := common.Marshal(membershipFreeModelsMap)
	if err != nil {
		common.SysError("error marshalling membership free models: " + err.Error())
		return "{}"
	}
	return string(jsonBytes)
}

// GetMembershipFreeModelsCopy returns a shallow copy of the current map.
func GetMembershipFreeModelsCopy() map[string]bool {
	membershipFreeModelsLock.RLock()
	defer membershipFreeModelsLock.RUnlock()
	out := make(map[string]bool, len(membershipFreeModelsMap))
	for k, v := range membershipFreeModelsMap {
		out[k] = v
	}
	return out
}
