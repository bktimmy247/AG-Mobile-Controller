@echo off
setlocal
if "%AG_TOKEN%"=="" set AG_TOKEN=change-this-token
if "%AG_WINDOW_HINT%"=="" set AG_WINDOW_HINT=Antigravity
if "%AG_PORT%"=="" set AG_PORT=19199
echo Starting CD Antigravity PC Controller...
echo URL: http://0.0.0.0:%AG_PORT%
echo Window hint: %AG_WINDOW_HINT%
echo Token: %AG_TOKEN%
node server.mjs
pause
