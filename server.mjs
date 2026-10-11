import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createBridge} from './codex-bridge.mjs';
const allowed = new Map([
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']], ['/app.js', ['app.js', 'text/javascript']],
  ['/model.js', ['model.js', 'text/javascript']], ['/cloud.js', ['cloud.js', 'text/javascript']], ['/icon.svg', ['icon.svg', 'image/svg+xml']],
  ['/assets/OwnglyphCorncorn.ttf', ['assets/OwnglyphCorncorn.ttf', 'font/ttf']],
  ['/assets/bomi-logo.png', ['assets/bomi-logo.png', 'image/png']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']]
]);
for (let stage=0;stage<=3;stage++) allowed.set(`/assets/flower-stage-${stage}.png`,[`assets/flower-stage-${stage}.png`,'image/png']);
export function createAppServer(bridge=createBridge(), {cloudOrigin=''}={}) {
  if(cloudOrigin && (!/^https:\/\/[^/]+$/.test(cloudOrigin) || new URL(cloudOrigin).origin!==cloudOrigin))throw new Error('보미의 HTTPS 원본 주소를 입력해주세요.');
  return createServer(async (req, res) => {
  const host=`127.0.0.1:${req.socket.localPort}`;
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.headers.host!==host)return json(403,{error:'로컬 보미 주소에서만 사용할 수 있어요.'});
  let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{return json(400,{error:'주소를 확인해주세요.'});}
  if(path==='/api/config'&&req.method==='GET')return json(200,{mode:'local'});
  if(path.startsWith('/api/codex/')) {
    const remote=!!cloudOrigin && req.headers.origin===cloudOrigin;
    if(remote){
      res.setHeader('Access-Control-Allow-Origin',cloudOrigin);
      res.setHeader('Vary','Origin');
      if(req.method==='OPTIONS'){
        if(!['GET','POST'].includes(req.headers['access-control-request-method']))return json(403,{error:'지원하지 않는 요청이에요.'});
        res.setHeader('Access-Control-Allow-Methods','GET, POST');
        res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Bomi-Request');
        res.setHeader('Access-Control-Allow-Private-Network','true');
        res.writeHead(204);return res.end();
      }
      if(req.headers['x-bomi-request']!=='1')return json(403,{error:'보미 화면에서 요청해주세요.'});
    }
    if(!remote && (req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==`http://${host}`)))return json(403,{error:'보미 화면에서 요청해주세요.'});
    try {
      if(path==='/api/codex/status'&&req.method==='GET')return json(200,await bridge.status());
      if(req.method!=='POST'||(!remote && req.headers.origin!==`http://${host}`)||req.headers['x-bomi-request']!=='1'||req.headers['content-type']!=='application/json')return json(403,{error:'보미 화면에서 요청해주세요.'});
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return json(413,{error:'요청이 너무 커요.'});}
      let value;try{value=JSON.parse(body);}catch{return json(400,{error:'요청 형식을 확인해주세요.'});}
      if(path==='/api/codex/collect')return json(200,await bridge.collect(value?.date));
      if(path==='/api/codex/connect')return json(200,await bridge.connect(value?.threadId));
      if(path==='/api/codex/close')return json(200,await bridge.close(value?.id));
      return json(404,{error:'지원하지 않는 요청이에요.'});
    } catch {return json(400,{error:'요청을 처리하지 못했어요. 연결 설정과 날짜를 확인해주세요.'});}
  }
  const file = allowed.get(path);
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end(); }
  try {
    const body = await readFile(new URL(`./app/${file[0]}`, import.meta.url));
    res.writeHead(200, {'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load page'); }
}); }
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const bridgeMode=process.argv[2]==='--bridge';
  const cloudOrigin=bridgeMode?process.argv[3]:'';
  if(bridgeMode&&!cloudOrigin)throw new Error('npm run bridge -- https://보미주소 형식으로 실행해주세요.');
  const port=Number(process.env.PORT||(bridgeMode?4174:4173));
  createAppServer(undefined,{cloudOrigin}).listen(port,'127.0.0.1',()=>console.log(`Bomi: http://127.0.0.1:${port}`));
}
