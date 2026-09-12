/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package controller

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	uploadMaxFiles     = 10
	uploadMaxFileBytes = 20 << 20 // 20MB
	uploadBaseDir      = "data/uploads"
	uploadURLPrefix    = "/uploads"
)

var (
	uploadBaseURL     string
	uploadBaseURLOnce sync.Once
)

func getUploadBaseURL() string {
	uploadBaseURLOnce.Do(func() {
		uploadBaseURL = strings.TrimRight(common.GetEnvOrDefaultString("UPLOAD_BASE_URL", ""), "/")
	})
	return uploadBaseURL
}

var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

func detectImageExt(filename string, data []byte) (string, bool) {
	contentType := http.DetectContentType(data)
	if contentType == "application/octet-stream" {
		contentType = ""
	}
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(filename))
	}
	ext, ok := allowedImageTypes[contentType]
	return ext, ok
}

// UploadFiles handles multipart file uploads for the playground gallery.
// It stores files under data/uploads/YYYY-MM-DD/ and returns public URLs.
func UploadFiles(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("upload handler panic: %v", r))
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "upload handler internal error",
			})
		}
	}()

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid multipart form: " + err.Error(),
		})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "no files uploaded",
		})
		return
	}
	if len(files) > uploadMaxFiles {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("too many files, maximum is %d", uploadMaxFiles),
		})
		return
	}

	uploadDir := filepath.Join(uploadBaseDir, time.Now().Format("2006-01-02"))
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "failed to create upload directory: " + err.Error(),
		})
		return
	}

	urls := make([]string, 0, len(files))
	for _, header := range files {
		if header.Size > uploadMaxFileBytes {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": fmt.Sprintf("file %s exceeds 20MB limit", header.Filename),
			})
			return
		}

		opened, err := header.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "failed to open uploaded file: " + err.Error(),
			})
			return
		}

		data, err := io.ReadAll(opened)
		opened.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "failed to read uploaded file: " + err.Error(),
			})
			return
		}

		ext, ok := detectImageExt(header.Filename, data)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": fmt.Sprintf("file %s is not a supported image type", header.Filename),
			})
			return
		}

		filename := uuid.New().String() + ext
		filePath := filepath.Join(uploadDir, filename)
		if err := os.WriteFile(filePath, data, 0o644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "failed to save uploaded file: " + err.Error(),
			})
			return
		}

		relURL := strings.ReplaceAll(filepath.Join(uploadURLPrefix, time.Now().Format("2006-01-02"), filename), "\\", "/")
		if base := getUploadBaseURL(); base != "" {
			urls = append(urls, base+relURL)
		} else {
			urls = append(urls, relURL)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    urls,
	})
}
