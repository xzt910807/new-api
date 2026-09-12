$pass = 'C4X3RQjVYq7HGmkRf6w848dbWUwKnxN4'

function Read-Reply([System.Net.Sockets.NetworkStream]$stream) {
  $buf = New-Object byte[] 16384
  $n = $stream.Read($buf, 0, $buf.Length)
  return [System.Text.Encoding]::ASCII.GetString($buf, 0, $n).Trim()
}

function Send-Cmd([System.Net.Sockets.NetworkStream]$stream, [string]$cmd) {
  $bytes = [System.Text.Encoding]::ASCII.GetBytes($cmd + "`r`n")
  $stream.Write($bytes, 0, $bytes.Length)
  return Read-Reply $stream
}

# --- connection 1: set password, rewrite config, verify ---
$client = New-Object System.Net.Sockets.TcpClient
try {
  $client.Connect('47.93.124.54', 6379)
  $stream = $client.GetStream()
  $stream.ReadTimeout = 8000

  Write-Output ('CONFIG SET requirepass -> ' + (Send-Cmd $stream ("CONFIG SET requirepass " + $pass)))
  Write-Output ('AUTH (re-auth same conn) -> ' + (Send-Cmd $stream ("AUTH " + $pass)))
  Write-Output ('CONFIG REWRITE          -> ' + (Send-Cmd $stream 'CONFIG REWRITE'))
  Write-Output ('PING                    -> ' + (Send-Cmd $stream 'PING'))

  $info = Send-Cmd $stream 'INFO replication'
  foreach ($line in ($info -split "`n")) {
    if ($line -match '^(role|connected_slaves):') { Write-Output $line.Trim() }
  }
} catch {
  Write-Output ('failed: ' + $_.Exception.Message)
} finally {
  $client.Close()
}

# --- connection 2: verify anonymous access is now rejected ---
Start-Sleep -Milliseconds 300
$client2 = New-Object System.Net.Sockets.TcpClient
try {
  $client2.Connect('47.93.124.54', 6379)
  $stream2 = $client2.GetStream()
  $stream2.ReadTimeout = 5000
  Write-Output ('anonymous PING (expect NOAUTH error) -> ' + (Send-Cmd $stream2 'PING'))
  Write-Output ('wrong password AUTH (expect error)    -> ' + (Send-Cmd $stream2 'AUTH wrong-password-test'))
} catch {
  Write-Output ('probe failed: ' + $_.Exception.Message)
} finally {
  $client2.Close()
}
