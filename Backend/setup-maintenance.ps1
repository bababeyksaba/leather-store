param([string]$Python = "$PSScriptRoot\venv\Scripts\python.exe", [string]$Container = "leather_postgres")
$ErrorActionPreference = "Stop"
if (!(Test-Path $Python)) { throw "Python environment not found. Pass -Python with its full path." }
$Python = (Resolve-Path $Python).Path
$manage = Join-Path $PSScriptRoot "manage.py"
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
$expiryAction = New-ScheduledTaskAction -Execute $Python -Argument "`"$manage`" expire_orders" -WorkingDirectory $PSScriptRoot
$expiryTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
$backupAction = New-ScheduledTaskAction -Execute $Python -Argument "`"$manage`" backup_store --container $Container --keep 7" -WorkingDirectory $PSScriptRoot
$backupTrigger = New-ScheduledTaskTrigger -Daily -At "02:00"
Register-ScheduledTask -TaskName "LeatherStore-ReservationExpiry" -Action $expiryAction -Trigger $expiryTrigger -Principal $principal -Settings $settings -Force | Out-Null
Register-ScheduledTask -TaskName "LeatherStore-DailyBackup" -Action $backupAction -Trigger $backupTrigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Scheduled tasks installed. They run while this user is signed in and Docker is available."
