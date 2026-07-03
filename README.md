# CD Antigravity Mobile Controller

MVP to control Antigravity on a Windows PC from an iPhone through Tailscale.

```text
iPhone Expo app
→ Tailscale private network
→ PC Controller server
→ Windows focus/clipboard/paste
→ Antigravity
```

## What works in v0.1

- PC controller HTTP server on port `19199`.
- Token auth via `Authorization: Bearer <token>`.
- `POST /send-prompt` copies prompt to Windows clipboard, focuses an Antigravity window, pastes, and presses Enter.
- `GET /screenshot` captures the current primary screen as PNG.
- Expo app for iPhone: connect, send prompt, refresh screenshot, prompt history.
- Tailscale-ready: connect to `http://PC-TAILSCALE-IP:19199`.

## Limitations

- Windows session must be active. If the PC is locked/asleep, UI automation may fail.
- Antigravity must be open and the window title should contain `Antigravity`.
- The MVP uses clipboard + SendKeys. It is simple and free, but not as robust as a native plugin.
- The Stop endpoint only records a stop request in v0.1; stop manually in Antigravity.

## Setup: Tailscale

1. Install Tailscale on Windows PC.
2. Install Tailscale on iPhone.
3. Log into the same Tailnet.
4. On iPhone, turn on Tailscale VPN.
5. Copy the PC Tailscale IP, usually `100.x.x.x`.

## Run PC Controller

```powershell
cd C:\Users\Admin\.openclaw\workspace-main\projects\cd-antigravity-mobile-controller\pc-controller
$env:AG_TOKEN="choose-a-long-token"
$env:AG_WINDOW_HINT="Antigravity"
npm start
```

Health check from PC:

```text
http://127.0.0.1:19199/health
```

Health check from iPhone over Tailscale:

```text
http://100.x.x.x:19199/health
```

## Run Expo app

```powershell
cd C:\Users\Admin\.openclaw\workspace-main\projects\cd-antigravity-mobile-controller\mobile-expo
npm install
npx expo start
```

Open with Expo Go on iPhone.

In the app:

- PC Controller URL: `http://100.x.x.x:19199`
- Token: same as `AG_TOKEN`
- Tap **Test**.
- Type prompt.
- Tap **Send to Antigravity**.

## API

### GET /health

No auth required. Returns controller status.

### POST /send-prompt

Auth required if `AG_TOKEN` is set.

```json
{
  "prompt": "Continue the current task and summarize your plan first.",
  "enter": true,
  "windowHint": "Antigravity"
}
```

### GET /screenshot?fresh=1

Auth required. Captures and returns PNG screenshot.

### GET /status

Auth required. Returns recent history.

### POST /stop

Auth required. Records a stop request. Manual stop is still required in v0.1.

## Safety checklist

- Use Tailscale, not public no-auth internet.
- Set `AG_TOKEN`.
- Keep PC awake and unlocked while using UI automation.
- Start with harmless prompts.
- Do not paste secrets into prompt history.

## Next improvements

- Better Antigravity window detection.
- Hotkey-based stop/continue.
- Live screenshot streaming via WebSocket.
- File/image attachment sender.
- Native Windows helper for more reliable UI automation.
