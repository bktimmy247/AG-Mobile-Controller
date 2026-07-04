param(
  [Parameter(Mandatory=$true)][string]$PromptFile,
  [string]$WindowHint = "Antigravity",
  [string]$SendEnter = "1",
  [string]$FocusMode = "none"
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

# Some apps keep focus in the editor/terminal even after the window is foregrounded.
# Target-specific focus modes can move focus to the prompt/chat/composer input first.
switch ($FocusMode.ToLowerInvariant()) {
  "cursor-agent" {
    # Cursor: Ctrl+I focuses/opens the Composer/Agent prompt in most default keymaps.
    [System.Windows.Forms.SendKeys]::SendWait('^i')
    Start-Sleep -Milliseconds 750
  }
  "cursor-chat" {
    # Alternate Cursor shortcut used by some users/keymaps for chat.
    [System.Windows.Forms.SendKeys]::SendWait('^l')
    Start-Sleep -Milliseconds 750
  }
  default {
    Start-Sleep -Milliseconds 100
  }
}

[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 250
if ($SendEnter -eq "1") {
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
}

Write-Output "Pasted prompt into '$($proc.MainWindowTitle)' enter=$SendEnter focusMode=$FocusMode"
