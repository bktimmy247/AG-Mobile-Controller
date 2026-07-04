import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AG_PORT || 19199);
const HOST = process.env.AG_HOST || '0.0.0.0';
const TOKEN = process.env.AG_TOKEN || 'change-me-please';
const WINDOW_HINT = process.env.AG_WINDOW_HINT || 'Antigravity';
const STATE_DIR = path.join(__dirname, '.state');
const SCREENSHOT = path.join(STATE_DIR, 'latest.png');
const HISTORY = path.join(STATE_DIR, 'history.jsonl');

function now(){ return new Date().toISOString(); }
function send(res, code, obj, headers={}){
  const isBuffer = Buffer.isBuffer(obj);
  const body = isBuffer ? obj : JSON.stringify(obj, null, 2);
  res.writeHead(code, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'content-type': isBuffer ? 'image/png' : 'application/json; charset=utf-8',
    ...headers
  });
  res.end(body);
}
function checkAuth(req){
  if(!TOKEN || TOKEN === 'change-me-please') return true;
  return req.headers.authorization === `Bearer ${TOKEN}` || req.headers['x-controller-token'] === TOKEN;
}
async function readJson(req, limit=1_000_000){
  let body='';
  for await (const chunk of req){
    body += chunk;
    if(body.length > limit) throw new Error('body too large');
  }
  return body ? JSON.parse(body) : {};
}
function ps(script, args=[], timeoutMs=30000){
  return new Promise((resolve)=>{
    let stdout='', stderr='', done=false;
    const child = spawn('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File', script, ...args], { windowsHide:true });
    const timer = setTimeout(()=>{ if(!done){ try{ child.kill(); }catch{} } }, timeoutMs);
    child.stdout.on('data', d=> stdout += d.toString());
    child.stderr.on('data', d=> stderr += d.toString());
    child.on('close', code=>{ done=true; clearTimeout(timer); resolve({ exitCode:code, stdout:stdout.trim(), stderr:stderr.trim() }); });
    child.on('error', err=>{ done=true; clearTimeout(timer); resolve({ exitCode:null, stdout, stderr:String(err.message||err) }); });
  });
}
async function appendHistory(entry){
  await fs.mkdir(STATE_DIR, { recursive:true });
  await fs.appendFile(HISTORY, JSON.stringify({ ts:now(), ...entry }) + '\n', 'utf8');
}
async function sendPrompt(prompt, options={}){
  const id = randomUUID();
  const promptFile = path.join(STATE_DIR, `${id}.txt`);
  await fs.mkdir(STATE_DIR, { recursive:true });
  await fs.writeFile(promptFile, prompt, 'utf8');
  const script = path.join(__dirname, 'scripts', 'send-prompt.ps1');
  const enter = options.enter === false ? '0' : '1';
  const focusMode = options.focusMode || 'none';
  const result = await ps(script, [promptFile, options.windowHint || WINDOW_HINT, enter, focusMode], 45000);
  await appendHistory({ id, type:'send-prompt', promptPreview:prompt.slice(0,300), result });
  return { id, ok: result.exitCode === 0, result };
}
async function captureScreenshot(){
  await fs.mkdir(STATE_DIR, { recursive:true });
  const script = path.join(__dirname, 'scripts', 'screenshot.ps1');
  const result = await ps(script, [SCREENSHOT], 30000);
  return { ok: result.exitCode === 0, path: SCREENSHOT, result };
}
async function history(limit=50){
  const txt = await fs.readFile(HISTORY, 'utf8').catch(()=> '');
  return txt.trim().split(/\r?\n/).filter(Boolean).slice(-limit).map(x=>{ try{return JSON.parse(x);}catch{return { raw:x };} });
}

const server = http.createServer(async (req,res)=>{
  try{
    const url = new URL(req.url, `http://${req.headers.host}`);
    if(req.method === 'OPTIONS') return send(res, 204, {});
    if(url.pathname === '/health') return send(res, 200, { ok:true, name:'CD Antigravity PC Controller', version:'0.1.0', port:PORT, host:HOST, authRequired: !!TOKEN && TOKEN !== 'change-me-please', windowHint:WINDOW_HINT });
    if(!checkAuth(req)) return send(res, 401, { error:'unauthorized' });
    if(url.pathname === '/status') return send(res, 200, { ok:true, time:now(), latestScreenshot:SCREENSHOT, history: await history(20) });
    if(url.pathname === '/send-prompt' && req.method === 'POST'){
      const body = await readJson(req);
      if(!body.prompt || typeof body.prompt !== 'string') return send(res, 400, { error:'prompt required' });
      const out = await sendPrompt(body.prompt, { enter: body.enter !== false, windowHint: body.windowHint, focusMode: body.focusMode });
      return send(res, out.ok ? 200 : 500, out);
    }
    if(url.pathname === '/screenshot'){
      const fresh = url.searchParams.get('fresh') !== '0';
      if(fresh) await captureScreenshot();
      const img = await fs.readFile(SCREENSHOT).catch(()=>null);
      if(!img) return send(res, 404, { error:'no screenshot yet' });
      return send(res, 200, img, { 'cache-control':'no-store' });
    }
    if(url.pathname === '/stop' && req.method === 'POST'){
      await appendHistory({ type:'stop', note:'Stop requested (MVP records only; Antigravity stop automation not implemented yet).' });
      return send(res, 200, { ok:true, message:'Stop recorded. Manual stop in Antigravity if needed.' });
    }
    return send(res, 404, { error:'not_found' });
  } catch(err){
    return send(res, 500, { error:String(err.message||err) });
  }
});

server.listen(PORT, HOST, ()=>{
  console.log(`CD Antigravity PC Controller listening http://${HOST}:${PORT}`);
  console.log(`Token auth: ${TOKEN && TOKEN !== 'change-me-please' ? 'enabled' : 'disabled (set AG_TOKEN)'}`);
  console.log(`Window hint: ${WINDOW_HINT}`);
});
