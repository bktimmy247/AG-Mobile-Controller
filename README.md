# AG Mobile Controller

Control **Antigravity** (or any window) on your Windows PC from your **iPhone**, over a private **Tailscale** network. Send prompts, take screenshots, and view your PC screen — all from your phone.

> Điều khiển **Antigravity** trên PC Windows từ **iPhone** qua mạng riêng **Tailscale**. Gửi prompt, chụp màn hình, xem màn hình PC ngay trên điện thoại.

![status](https://img.shields.io/badge/platform-iPhone%20%2B%20Windows-blue) ![license](https://img.shields.io/badge/license-MIT-green)

---

## 🇬🇧 English

### What it does
- **PC controller** (Node.js): a tiny HTTP server on your Windows PC.
- **Mobile app** (Expo / React Native): runs on your iPhone via Expo Go.
- Phone sends a prompt → PC copies it to clipboard, focuses the Antigravity window, pastes, and presses Enter.
- Phone can pull a live **screenshot** of the PC and **pinch-to-zoom** it.
- Traffic goes over **Tailscale** (private VPN), protected by a **token**.

### Architecture
```
iPhone (Expo Go app)
   │  HTTP over Tailscale (100.x.x.x)
   ▼
PC Controller server (Node, port 19199)
   │  clipboard + SendKeys + screenshot
   ▼
Antigravity window on Windows
```

### Requirements
- Windows PC with **Node.js 18+**
- iPhone with **Expo Go** (from the App Store)
- **Tailscale** installed on both PC and iPhone (same account)
- The app you want to control open on the PC (default window hint: `Antigravity`)

### 1. Set up Tailscale
1. Install Tailscale on the Windows PC and log in.
2. Install Tailscale on the iPhone, log into the same account, turn the VPN on.
3. Find your PC's Tailscale IP (looks like `100.x.x.x`): run `tailscale ip -4` on the PC.

### 2. Run the PC Controller
```powershell
cd pc-controller

# choose your own long random token
$env:AG_TOKEN = "my-very-long-secret-token"
$env:AG_WINDOW_HINT = "Antigravity"   # window title to target
$env:AG_PORT = "19199"

node server.mjs
```
You should see: `CD Antigravity PC Controller listening http://0.0.0.0:19199`.

Health check (from PC): open `http://127.0.0.1:19199/health` → should return JSON `ok:true`.

> Tip: there is also `START_CONTROLLER.bat`. Edit the token inside it, then double-click to run.

### 3. Run the mobile app
```powershell
cd mobile-expo
npm install
npx expo start
```
Scan the QR code with **Expo Go** (open Expo Go → "Scan QR code" — the iOS Camera app won't work).

### 4. Connect from the phone
In the app's **Connect** section:
- **PC Controller URL:** `http://<your-tailscale-ip>:19199`
- **Token:** the same `AG_TOKEN` you set on the PC
- Tap **Save**, then **Test**. You should see `Connected: ...`.

### 5. Use it
- Type a prompt → **Send to Antigravity** → the text is pasted into the Antigravity window and Enter is pressed.
- Tap **Refresh screen** to pull a fresh screenshot.
- **Tap the screenshot** to open full screen and **pinch to zoom**.

### API (server)
| Method | Path | Auth | Description |
|-------|------|------|-------------|
| GET | `/health` | no | Controller status |
| POST | `/send-prompt` | yes | Body: `{ "prompt": "...", "enter": true }` |
| GET | `/screenshot?fresh=1` | yes | Returns a PNG screenshot |
| GET | `/status` | yes | Recent prompt history |
| POST | `/stop` | yes | Records a stop request (manual stop in v0.1) |

### Security notes
- **Never** commit your real token. `pc-controller/.state-token.txt` is gitignored; copy `.state-token.txt.example` to note your own.
- Use Tailscale, not a public port on the internet.
- Keep the PC awake and unlocked while using UI automation.
- The screenshot shows your whole screen — only use over a private network.

### Troubleshooting
- **"Window not found"** → open the target app first, or set `AG_WINDOW_HINT` to match its window title.
- **Test times out** → check Tailscale VPN is on; open `http://<ip>:19199/health` in the phone's Safari. If that fails, allow port 19199 in Windows Firewall.
- **Red screen in Expo Go** → see the fix runbook below.

---

## 🇻🇳 Tiếng Việt

### App này làm gì
- **PC controller** (Node.js): một server HTTP nhỏ chạy trên PC Windows.
- **App điện thoại** (Expo / React Native): chạy trên iPhone qua Expo Go.
- Điện thoại gửi prompt → PC copy vào clipboard, focus cửa sổ Antigravity, dán và nhấn Enter.
- Điện thoại lấy được **ảnh màn hình PC** trực tiếp và **chụm 2 ngón để phóng to**.
- Kết nối qua **Tailscale** (VPN riêng), bảo vệ bằng **token**.

### Yêu cầu
- PC Windows có **Node.js 18+**
- iPhone có **Expo Go** (tải trên App Store)
- **Tailscale** cài trên cả PC và iPhone (cùng tài khoản)
- Mở sẵn app cần điều khiển trên PC (mặc định tìm cửa sổ tên `Antigravity`)

### 1. Cài Tailscale
1. Cài Tailscale trên PC, đăng nhập.
2. Cài Tailscale trên iPhone, đăng nhập cùng tài khoản, bật VPN.
3. Lấy IP Tailscale của PC (dạng `100.x.x.x`): chạy `tailscale ip -4` trên PC.

### 2. Chạy PC Controller
```powershell
cd pc-controller

# tự đặt một token dài, ngẫu nhiên
$env:AG_TOKEN = "token-bi-mat-that-dai-cua-ban"
$env:AG_WINDOW_HINT = "Antigravity"
$env:AG_PORT = "19199"

node server.mjs
```
Thấy dòng `... listening http://0.0.0.0:19199` là chạy được.

Kiểm tra: mở `http://127.0.0.1:19199/health` trên PC → phải ra JSON `ok:true`.

> Mẹo: có sẵn `START_CONTROLLER.bat`, sửa token bên trong rồi bấm đúp để chạy.

### 3. Chạy app điện thoại
```powershell
cd mobile-expo
npm install
npx expo start
```
Quét QR bằng **Expo Go** (mở Expo Go → "Scan QR code" — camera thường của iOS không mở được).

### 4. Kết nối từ điện thoại
Ở mục **Connect** trong app:
- **PC Controller URL:** `http://<ip-tailscale-cua-ban>:19199`
- **Token:** đúng `AG_TOKEN` đã đặt trên PC
- Bấm **Save** rồi **Test** → thấy `Connected: ...` là ok.

### 5. Dùng
- Gõ prompt → **Send to Antigravity** → chữ được dán vào cửa sổ Antigravity và nhấn Enter.
- Bấm **Refresh screen** để lấy ảnh màn hình mới.
- **Chạm vào ảnh** để mở full màn hình, **chụm 2 ngón phóng to** đọc chữ nhỏ.

### Lưu ý bảo mật
- **Tuyệt đối không** commit token thật. File `pc-controller/.state-token.txt` đã được gitignore; copy `.state-token.txt.example` để ghi token của bạn.
- Dùng Tailscale, không mở port ra internet công khai.
- Giữ PC không khóa màn hình khi dùng (vì automation cần thao tác UI).
- Ảnh chụp là toàn màn hình — chỉ dùng trên mạng riêng.

### Xử lý sự cố
- **"Window not found"** → chưa mở app đích, hoặc đặt `AG_WINDOW_HINT` khớp tên cửa sổ.
- **Test timeout** → kiểm tra Tailscale đã bật; mở `http://<ip>:19199/health` trên Safari iPhone. Nếu cũng không vào → mở port 19199 trong Windows Firewall.
- **Màn đỏ trong Expo Go** → xem phần fix bên dưới.

---

## 🛠 Expo red-screen fix (for contributors)

If you hit `HMRClient.setup()` / `Property 'FormData' doesn't exist` / `Property 'WebSocket' doesn't exist`:

1. Delete any hand-written `polyfills.js` and its import — RN 0.81 already has these globals.
2. Clean reinstall: `rm -rf node_modules package-lock.json .expo && npm install && npx expo install --fix`.
3. Verify a single react-native: `npm ls react-native` (must be one 0.81.x).
4. If still failing, make the **first line** of `index.js`:
   ```js
   import 'react-native/Libraries/Core/InitializeCore';
   ```
5. Restart Metro clean: `npx expo start -c`.

Root cause: React Native's `InitializeCore` must run before app code to register `WebSocket`/`FormData`/`XHR`. A fake polyfill or mismatched `node_modules` breaks that ordering.

---

## License
MIT © 2026 Cuong Duc (bktimmy247). See [LICENSE](LICENSE).
