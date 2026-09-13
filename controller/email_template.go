package controller

import (
	"fmt"
	"time"
)

// buildVerificationEmailBody 生成 Agnes 风格的品牌化验证码邮件正文（HTML）。
func buildVerificationEmailBody(code string, validMinutes int) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>邮箱验证</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<!-- Header -->
<tr>
<td align="center" style="padding:48px 40px 24px;">
<div style="font-size:42px;font-weight:bold;font-style:italic;color:#1a1a1a;letter-spacing:1px;">Agnes</div>
</td>
</tr>
<!-- Title -->
<tr>
<td align="center" style="padding:0 40px 24px;">
<span style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:22px;font-weight:bold;padding:10px 32px;border-radius:4px;">验证您的邮箱地址</span>
</td>
</tr>
<!-- Instruction -->
<tr>
<td align="center" style="padding:0 40px 24px;">
<span style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;padding:6px 16px;border-radius:4px;">请输入以下验证码以确认您的邮箱地址：</span>
</td>
</tr>
<!-- Code Box -->
<tr>
<td align="center" style="padding:0 40px 32px;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="background-color:#f8f9fa;border-radius:8px;padding:32px;">
<span style="font-size:44px;font-weight:bold;color:#2563eb;letter-spacing:12px;font-family:'Courier New',Courier,monospace;">%s</span>
</td>
</tr>
</table>
</td>
</tr>
<!-- Note -->
<tr>
<td align="center" style="padding:0 40px 40px;">
<span style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:14px;padding:6px 16px;border-radius:4px;">验证码 %%d 分钟内有效，如果您没有请求此验证码，请忽略此邮件。</span>
</td>
</tr>
<!-- Footer -->
<tr>
<td align="center" style="padding:0 40px 40px;">
<p style="margin:0;font-size:12px;color:#999999;">&copy; %d %s</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`, code, validMinutes, time.Now().Year(), "爱思科技")
}

// buildPasswordResetEmailBody 生成 Agnes 风格的品牌化密码重置邮件正文（HTML）。
func buildPasswordResetEmailBody(link string, validMinutes int) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>密码重置</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<!-- Header -->
<tr>
<td align="center" style="padding:48px 40px 24px;">
<div style="font-size:42px;font-weight:bold;font-style:italic;color:#1a1a1a;letter-spacing:1px;">Agnes</div>
</td>
</tr>
<!-- Title -->
<tr>
<td align="center" style="padding:0 40px 24px;">
<span style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:22px;font-weight:bold;padding:10px 32px;border-radius:4px;">重置您的密码</span>
</td>
</tr>
<!-- Instruction -->
<tr>
<td align="center" style="padding:0 40px 24px;">
<span style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;padding:6px 16px;border-radius:4px;">请点击下方按钮重置您的密码：</span>
</td>
</tr>
<!-- Button -->
<tr>
<td align="center" style="padding:0 40px 32px;">
<a href="%s" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:bold;padding:14px 48px;border-radius:6px;text-decoration:none;">重置密码</a>
</td>
</tr>
<!-- Fallback link -->
<tr>
<td align="center" style="padding:0 40px 24px;">
<p style="margin:0;font-size:13px;color:#666666;">如果按钮无法点击，请复制以下链接到浏览器打开：</p>
<p style="margin:8px 0 0;font-size:12px;color:#2563eb;word-break:break-all;">%s</p>
</td>
</tr>
<!-- Note -->
<tr>
<td align="center" style="padding:0 40px 40px;">
<span style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:14px;padding:6px 16px;border-radius:4px;">重置链接 %%d 分钟内有效，如果您没有请求此重置，请忽略此邮件。</span>
</td>
</tr>
<!-- Footer -->
<tr>
<td align="center" style="padding:0 40px 40px;">
<p style="margin:0;font-size:12px;color:#999999;">&copy; %d %s</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`, link, link, validMinutes, time.Now().Year(), "爱思科技")
}
