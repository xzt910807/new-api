$client = New-Object System.Net.Sockets.TcpClient
try {
  $client.Connect('47.93.124.54', 6379)
  $stream = $client.GetStream()
  $stream.ReadTimeout = 8000

  function Send-Cmd([string]$cmd) {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($cmd + "`r`n")
    $script:stream.Write($bytes, 0, $bytes.Length)
    $buf = New-Object byte[] 8192
    $n = $script:stream.Read($buf, 0, $buf.Length)
    return [System.Text.Encoding]::ASCII.GetString($buf, 0, $n).Trim()
  }

  Write-Output ('REPLICAOF NO ONE -> ' + (Send-Cmd 'REPLICAOF NO ONE'))
  Write-Output ('write test SET   -> ' + (Send-Cmd 'SET __new_api_write_test__ 1 EX 60'))
  Write-Output ('write test GET   -> ' + (Send-Cmd 'GET __new_api_write_test__'))
  Write-Output ('write test DEL   -> ' + (Send-Cmd 'DEL __new_api_write_test__'))
  Write-Output '--- INFO replication (trimmed) ---'
  $info = Send-Cmd 'INFO replication'
  foreach ($line in ($info -split "`n")) {
    if ($line -match '^(role|slave_read_only|connected_slaves|master_host|master_link_status):') {
      Write-Output $line.Trim()
    }
  }
} catch {
  Write-Output ('failed: ' + $_.Exception.Message)
} finally {
  $client.Close()
}
