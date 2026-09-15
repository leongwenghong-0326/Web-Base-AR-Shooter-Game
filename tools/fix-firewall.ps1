$ErrorActionPreference = "Continue"
$log = "C:\xampp\htdocs\ar_shooter_game\tools\firewall-fix.log"
function L($m){ Add-Content -Path $log -Value $m }

L ("Time: " + (Get-Date))

# Allow Apache httpd explicitly
$prog = "C:\xampp\apache\bin\httpd.exe"
foreach ($name in @("XAMPP Apache LAN Allow", "Apache HTTP Server")) {
  Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
}

New-NetFirewallRule -DisplayName "XAMPP Apache LAN Allow" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Any -Program $prog -Description "Allow smartphone access to XAMPP" | Out-Null
L "Created XAMPP Apache LAN Allow"

# Also open port 80 generally for private/public (needed when program path differs)
New-NetFirewallRule -DisplayName "XAMPP Port 80 LAN Allow" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Any -Description "Allow LAN HTTP to XAMPP" | Out-Null
L "Created XAMPP Port 80 LAN Allow"

# netsh backup approach
netsh advfirewall firewall add rule name="XAMPP Apache HTTP" dir=in action=allow protocol=TCP localport=80 | Out-Null
L "netsh rule added"

Get-NetFirewallRule -DisplayName "*XAMPP*","*Apache*" -ErrorAction SilentlyContinue |
  Select-Object DisplayName, Enabled, Action, Profile |
  Format-Table | Out-String | ForEach-Object { L $_ }

L "DONE"