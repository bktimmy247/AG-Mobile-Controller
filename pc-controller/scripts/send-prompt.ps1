param(
  [Parameter(Mandatory=$true)][string]$PromptFile,
  [string]$WindowHint = "Antigravity",
  [string]$SendEnter = "1"
)

$ErrorActionPreference = "Stop"
$prompt = Get-Content -Raw -Encoding UTF8 $PromptFile
Set-Clipboard -Value $prompt

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@

Add-Type -AssemblyName System.Windows.Forms

$proc = Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match [regex]::Escape($WindowHint)
} | Select-Object -First 1

if (-not $proc) {
  Write-Error "Window not found with title containing '$WindowHint'. Open Antigravity and try again."
  exit 2
}

[Win32]::ShowWindowAsync($proc.MainWindowHandle, 9) | Out-Null
Start-Sleep -Milliseconds 250
[Win32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 450

[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 250
if ($SendEnter -eq "1") {
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
}

Write-Output "Pasted prompt into '$($proc.MainWindowTitle)' enter=$SendEnter"
