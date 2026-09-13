package controller

import (
	"fmt"
	"time"
)

// textBar 返回一段居中黑色文字的邮件 HTML（无底色，对齐 Agnes 官方邮件的朴素风格）。
func textBar(text string, fontSize int, bold bool) string {
	weight := "normal"
	if bold {
		weight = "bold"
	}
	return fmt.Sprintf(`<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td align="center" style="color:#1a1a1a;font-size:%dpx;font-weight:%s;padding:8px 0;">%s</td></tr></table>`,
		fontSize, weight, text)
}

// buildVerificationEmailBody 生成 AI WTS 风格的品牌化验证码邮件正文（HTML）。
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
<div style="font-size:42px;font-weight:bold;font-style:italic;color:#1a1a1a;letter-spacing:1px;">AI WTS</div>
</td>
</tr>
<!-- Title -->
<tr>
<td align="center" style="padding:0 40px 24px;">
%s
</td>
</tr>
<!-- Instruction -->
<tr>
<td align="center" style="padding:0 40px 24px;">
%s
</td>
</tr>
<!-- Code Box -->
<tr>
<td align="center" style="padding:0 40px 32px;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" bgcolor="#f8f9fa" style="background-color:#f8f9fa;border-radius:8px;padding:32px;">
<span style="font-size:44px;font-weight:bold;color:#1a1a1a;letter-spacing:12px;font-family:'Courier New',Courier,monospace;">%s</span>
</td>
</tr>
</table>
</td>
</tr>
<!-- Note -->
<tr>
<td align="center" style="padding:0 40px 40px;">
%s
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
</html>`,
		textBar("验证您的邮箱地址", 22, true),
		textBar("请输入以下验证码以确认您的邮箱地址：", 15, false),
		code,
		textBar(fmt.Sprintf("验证码 %d 分钟内有效，如果您没有请求此验证码，请忽略此邮件。", validMinutes), 14, false),
		time.Now().Year(), "AI WTS")
}

// buildPasswordResetEmailBody 生成 AI WTS 风格的品牌化密码重置邮件正文（HTML）。
func buildPasswordResetEmailBody(link string, validMinutes int) string {
	button := fmt.Sprintf(`<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td align="center" style="border:1px solid #1a1a1a;border-radius:6px;"><a href="%s" target="_blank" style="display:inline-block;color:#1a1a1a;font-size:16px;font-weight:bold;padding:14px 48px;text-decoration:none;">重置密码</a></td></tr></table>`, link)
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
<div style="font-size:42px;font-weight:bold;font-style:italic;color:#1a1a1a;letter-spacing:1px;">AI WTS</div>
</td>
</tr>
<!-- Title -->
<tr>
<td align="center" style="padding:0 40px 24px;">
%s
</td>
</tr>
<!-- Instruction -->
<tr>
<td align="center" style="padding:0 40px 24px;">
%s
</td>
</tr>
<!-- Button -->
<tr>
<td align="center" style="padding:0 40px 32px;">
%s
</td>
</tr>
<!-- Fallback link -->
<tr>
<td align="center" style="padding:0 40px 24px;">
<p style="margin:0;font-size:13px;color:#666666;">如果按钮无法点击，请复制以下链接到浏览器打开：</p>
<p style="margin:8px 0 0;font-size:12px;color:#1a1a1a;word-break:break-all;">%s</p>
</td>
</tr>
<!-- Note -->
<tr>
<td align="center" style="padding:0 40px 40px;">
%s
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
</html>`,
		textBar("重置您的密码", 22, true),
		textBar("请点击下方按钮重置您的密码：", 15, false),
		button,
		link,
		textBar(fmt.Sprintf("重置链接 %d 分钟内有效，如果您没有请求此重置，请忽略此邮件。", validMinutes), 14, false),
		time.Now().Year(), "AI WTS")
}
