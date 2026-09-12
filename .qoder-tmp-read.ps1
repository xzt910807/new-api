$hit = Select-String -Path D:\workspace\new-api\model\log.go -Pattern 'func RecordConsumeLog'
$start = $hit.LineNumber
$lines = Get-Content D:\workspace\new-api\model\log.go
$total = $lines.Count
$end = [Math]::Min($start + 85, $total)
for ($i = $start - 1; $i -lt $end; $i++) {
  Write-Output (('{0}: {1}' -f ($i + 1), $lines[$i]))
}
