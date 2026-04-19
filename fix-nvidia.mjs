/**
 * 9Router Postinstall Fix Script
 *
 * Fixes:
 * - NVIDIA NIM 404: force `passthroughModels: true` in provider config.
 * - Windows MITM: avoid calling `lsof` (not available on Windows) in a retry/error path.
 * - Antigravity: expose unprefixed `models/<alias>` names for Gemini discovery.
 * - Antigravity: mirror MITM aliases into general `modelAliases`.
 * - Antigravity: bypass OAuth refresh for cloudcode requests routed through MITM.
 *
 * Usage:
 *   - After npm install: node fix-nvidia.mjs
 *   - Or add to postinstall in package.json: "postinstall": "node fix-nvidia.mjs"
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const chunksDir = join(__dirname, 'node_modules/9router/app/.next/server/chunks');
const antigravityModelsRoute = join(
  __dirname,
  'node_modules/9router/app/.next/server/app/api/v1beta/models/route.js'
);
const antigravityMitmServer = join(
  __dirname,
  'node_modules/9router/app/src/mitm/server.js'
);
const antigravityMainJs = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      'Programs',
      'Antigravity',
      'resources',
      'app',
      'out',
      'main.js'
    )
  : null;
const antigravityExtensionJs = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      'Programs',
      'Antigravity',
      'resources',
      'app',
      'extensions',
      'antigravity',
      'dist',
      'extension.js'
    )
  : null;
const antigravityChatJs = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      'Programs',
      'Antigravity',
      'resources',
      'app',
      'extensions',
      'antigravity',
      'out',
      'media',
      'chat.js'
    )
  : null;
const antigravityWorkbenchJs = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      'Programs',
      'Antigravity',
      'resources',
      'app',
      'out',
      'vs',
      'workbench',
      'workbench.desktop.main.js'
    )
  : null;
const antigravityJetskiJs = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      'Programs',
      'Antigravity',
      'resources',
      'app',
      'out',
      'jetskiAgent',
      'main.js'
    )
  : null;
const dbJsonPath = process.env.APPDATA
  ? join(process.env.APPDATA, '9router', 'db.json')
  : null;

if (!existsSync(chunksDir)) {
  console.log('9Router chunks not found. Run "npm install" first.');
  process.exit(1);
}

console.log('Applying 9Router fixes...\n');

const files = readdirSync(chunksDir).filter((f) => f.endsWith('.js'));
let patchedFiles = 0;

const patches = [
  // NVIDIA NIM: make model routing passthrough (avoid 404 when model name is appended to path)
  {
    find: 'nvidia:{id:"nvidia",alias:"nvidia",name:"NVIDIA NIM",icon:"developer_board"',
    replace:
      'nvidia:{id:"nvidia",alias:"nvidia",name:"NVIDIA NIM",passthroughModels:true,icon:"developer_board"',
    desc: 'NVIDIA: provider config',
    skipIf: 'passthroughModels:true'
  },
  {
    find: 'nvidia:{baseUrl:"https://integrate.api.nvidia.com/v1/chat/completions",format:"openai"}',
    replace:
      'nvidia:{passthroughModels:true,baseUrl:"https://integrate.api.nvidia.com/v1/chat/completions",format:"openai"}',
    desc: 'NVIDIA: API config',
    skipIf: 'passthroughModels:true'
  },

  // Windows MITM: guard against `lsof` execution on win32.
  {
    find:
      'else{let a=f("lsof -i :443",{encoding:"utf8"}).trim().split("\\n");if(a.length>1)return a[1].split(/\\s+/)[0]}',
    replace:
      'else{if("win32"===process.platform)return null;let a=f("lsof -i :443",{encoding:"utf8"}).trim().split("\\n");if(a.length>1)return a[1].split(/\\s+/)[0]}',
    desc: 'Windows: MITM lsof guard',
    skipIf: '"win32"===process.platform)return null'
  }
];

for (const file of files) {
  const filePath = join(chunksDir, file);
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const patch of patches) {
    if (content.includes(patch.find) && !(patch.skipIf && content.includes(patch.skipIf))) {
      content = content.replace(patch.find, patch.replace);
      modified = true;
      console.log(`- ${file}: ${patch.desc}`);
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    patchedFiles++;
  }
}

console.log(`\nPatched ${patchedFiles} files`);

if (existsSync(antigravityModelsRoute)) {
  let content = readFileSync(antigravityModelsRoute, 'utf-8');
  const routeFind =
    'var e=c(55103),f=c(30600),g=c(10087),h=c(42431),i=c(27321),j=c(42417),k=c(261),l=c(8555),m=c(87717),n=c(34935),o=c(66116),p=c(99218),q=c(43448),r=c(67162),s=c(80463),t=c(86439),u=c(99509),v=c(24709);async function w(){return new Response(null,{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"*"}})}async function x(){try{let a=[];for(let[c,d]of Object.entries(v.vq))for(let e of d)a.push({name:`models/${c}/${e.id}`,displayName:e.name||e.id,description:`${c} model: ${e.name||e.id}`,supportedGenerationMethods:["generateContent"],inputTokenLimit:128e3,outputTokenLimit:8192});return Response.json({models:a})}catch(a){return console.log("Error fetching models:",a),Response.json({error:{message:a.message}},{status:500})}}';
  const routeReplace =
    'var e=c(55103),f=c(30600),g=c(10087),h=c(42431),i=c(27321),j=c(42417),k=c(261),l=c(8555),m=c(87717),n=c(34935),o=c(66116),p=c(99218),q=c(43448),r=c(67162),s=c(80463),t=c(86439),u=c(99509),v=c(24709),w0=c(89442);async function w(){return new Response(null,{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"*"}})}async function x(){try{let a=[],b=new Set;for(let[c,d]of Object.entries(v.vq))for(let e of d){let d=`models/${c}/${e.id}`;a.push({name:d,displayName:e.name||e.id,description:`${c} model: ${e.name||e.id}`,supportedGenerationMethods:["generateContent"],inputTokenLimit:128e3,outputTokenLimit:8192}),b.add(d)}let c=await (0,w0.c)("antigravity");for(let[d,e]of Object.entries(c||{})){let c=`models/${d}`;b.has(c)||a.push({name:c,displayName:d,description:`antigravity alias: ${e}`,supportedGenerationMethods:["generateContent"],inputTokenLimit:128e3,outputTokenLimit:8192})}return Response.json({models:a})}catch(a){return console.log("Error fetching models:",a),Response.json({error:{message:a.message}},{status:500})}}';
  const routeAliasOld =
    'let c=await (0,w0.c)("antigravity");for(let[d,e]of Object.entries(c||{})){let c=`models/${d}`;b.has(c)||a.push({name:c,displayName:d,description:`antigravity alias: ${e}`,supportedGenerationMethods:["generateContent"],inputTokenLimit:128e3,outputTokenLimit:8192})}';
  const routeAliasNew =
    'let c=await (0,w0.c)("antigravity"),d=!1;try{let e=require("fs"),f=require("os"),g=require("path"),h=process.env.APPDATA||g.join(f.homedir(),"AppData","Roaming"),i=g.join(h,"9router","db.json");if(e.existsSync(i)){let a=JSON.parse(e.readFileSync(i,"utf-8"));d=!!a?.settings?.mitmEnabled}}catch{}for(let[e,f]of Object.entries(c||{})){let c=`models/${e}`,g=d&&f?String(f):e,h=d&&f?`antigravity alias: ${e} -> ${f}`:`antigravity alias: ${f}`;b.has(c)||a.push({name:c,displayName:g,description:h,supportedGenerationMethods:["generateContent"],inputTokenLimit:128e3,outputTokenLimit:8192})}';
  const routeResponseOld =
    'return Response.json({models:a})}catch(a){return console.log("Error fetching models:",a),Response.json({error:{message:a.message}},{status:500})}}';
  const routeResponseNew =
    'return Response.json({models:a,_9router:{antigravityMitmEnabled:d}},{headers:{"Access-Control-Allow-Origin":"*"}})}catch(a){return console.log("Error fetching models:",a),Response.json({error:{message:a.message}},{status:500,headers:{"Access-Control-Allow-Origin":"*"}})}}';

  if (content.includes(routeFind) && !content.includes('displayName:d,description:`antigravity alias: ${e}`')) {
    content = content.replace(routeFind, routeReplace);
    console.log('- v1beta/models route: Antigravity alias discovery');
  }

  if (content.includes(routeAliasOld) && !content.includes('antigravity alias: ${e} -> ${f}')) {
    content = content.replace(routeAliasOld, routeAliasNew);
    console.log('- v1beta/models route: displayName follows mapped model when MITM is enabled');
  }

  if (content.includes(routeResponseOld) && !content.includes('_9router:{antigravityMitmEnabled:d}')) {
    content = content.replace(routeResponseOld, routeResponseNew);
    console.log('- v1beta/models route: expose MITM state and allow workbench CORS fetch');
  }

  if (content !== readFileSync(antigravityModelsRoute, 'utf-8')) {
    writeFileSync(antigravityModelsRoute, content, 'utf-8');
  }
}

if (existsSync(antigravityMitmServer)) {
  let content = readFileSync(antigravityMitmServer, 'utf-8');
  const mitmFind =
    "const _0x49b4af=getMappedModel(_0x4b9036,_0x9558ef);if(!_0x49b4af)return log(_0x1ade63(0x136)+_0x4b9036+_0x1ade63(0xb9)+(_0x9558ef||_0x1ade63(0x18a))),passthrough(_0x1464f2,_0x328884,_0x39246a);return log(_0x1ade63(0x111)+_0x4b9036+'\\x20|\\x20'+_0x9558ef+_0x1ade63(0x132)+_0x49b4af),handlers[_0x4b9036]['intercept'](_0x1464f2,_0x328884,_0x39246a,_0x49b4af,passthrough);";
  const mitmReplace =
    "const _0x49b4af=getMappedModel(_0x4b9036,_0x9558ef);if(!_0x49b4af){if(_0x4b9036==='antigravity'&&_0x1464f2.method==='GET'&&_0x1464f2.url.startsWith('/v1beta/models')){let _0x2f66a7=await fetch('http://localhost:20128/api'+_0x1464f2.url);_0x328884.writeHead(_0x2f66a7.status,{'Content-Type':_0x2f66a7.headers.get('content-type')||'application/json','Access-Control-Allow-Origin':'*'}),_0x328884.end(await _0x2f66a7.text());return}return log(_0x1ade63(0x136)+_0x4b9036+_0x1ade63(0xb9)+(_0x9558ef||_0x1ade63(0x18a))),passthrough(_0x1464f2,_0x328884,_0x39246a)}return log(_0x1ade63(0x111)+_0x4b9036+'\\x20|\\x20'+_0x9558ef+_0x1ade63(0x132)+_0x49b4af),handlers[_0x4b9036]['intercept'](_0x1464f2,_0x328884,_0x39246a,_0x49b4af,passthrough);";

  if (content.includes(mitmFind) && !content.includes("fetch('http://localhost:20128/api'+_0x1464f2.url)")) {
    content = content.replace(mitmFind, mitmReplace);
    writeFileSync(antigravityMitmServer, content, 'utf-8');
    console.log('- MITM server: Antigravity model discovery proxy');
  }

  const resolveFind =
    "var cachedTargetIPs={},CACHE_TTL_MS=0x5*0x3c*0x3e8;async function resolveTargetIP(_0x113051){const _0x21f10a=a0_0x1fd54d,_0x2a2ee8=cachedTargetIPs[_0x113051];if(_0x2a2ee8&&Date[_0x21f10a(0xc0)]()-_0x2a2ee8['ts']<CACHE_TTL_MS)return _0x2a2ee8['ip'];const _0x16e995=new dns[(_0x21f10a(0x15b))]();_0x16e995[_0x21f10a(0x14f)]([_0x21f10a(0xd5)]);const _0x1f0ff6=promisify(_0x16e995[_0x21f10a(0xdb)]['bind'](_0x16e995)),_0x3af684=await _0x1f0ff6(_0x113051);return cachedTargetIPs[_0x113051]={'ip':_0x3af684[0x0],'ts':Date[_0x21f10a(0xc0)]()},cachedTargetIPs[_0x113051]['ip'];}";
  const resolveReplace =
    "var cachedTargetIPs={},CACHE_TTL_MS=0x5*0x3c*0x3e8;function isUnsafeLoopbackIP(_0x113051){if(!_0x113051)return!0;if(_0x113051==='::1'||_0x113051==='0.0.0.0')return!0;const _0x2a2ee8=String(_0x113051);if(_0x2a2ee8.startsWith('127.'))return!0;if(_0x2a2ee8.startsWith('10.'))return!0;if(_0x2a2ee8.startsWith('192.168.'))return!0;if(_0x2a2ee8.startsWith('169.254.'))return!0;if(/^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(_0x2a2ee8))return!0;return!1;}async function resolveTargetIP(_0x113051){const _0x21f10a=a0_0x1fd54d,_0x2a2ee8=cachedTargetIPs[_0x113051];if(_0x2a2ee8&&Date[_0x21f10a(0xc0)]()-_0x2a2ee8['ts']<CACHE_TTL_MS&&!isUnsafeLoopbackIP(_0x2a2ee8['ip']))return _0x2a2ee8['ip'];const _0x16e995=new dns[(_0x21f10a(0x15b))]();_0x16e995[_0x21f10a(0x14f)]([_0x21f10a(0xd5),'1.1.1.1']);const _0x1f0ff6=promisify(_0x16e995[_0x21f10a(0xdb)]['bind'](_0x16e995)),_0x3af684=await _0x1f0ff6(_0x113051),_0x2dd7de=_0x3af684?.[0x0];if(!_0x2dd7de)throw new Error('DNS resolve returned empty result for '+_0x113051);if(TARGET_HOSTS.includes(_0x113051)&&isUnsafeLoopbackIP(_0x2dd7de))throw new Error('Unsafe DNS resolution for '+_0x113051+': '+_0x2dd7de);return cachedTargetIPs[_0x113051]={'ip':_0x2dd7de,'ts':Date[_0x21f10a(0xc0)]()},cachedTargetIPs[_0x113051]['ip'];}";

  if (content.includes(resolveFind) && !content.includes('isUnsafeLoopbackIP(')) {
    content = content.replace(resolveFind, resolveReplace);
    console.log('- MITM server: guarded DNS resolution against loopback/private IP');
  }

  const passthroughFind =
    "async function passthrough(_0x42c395,_0x412e06,_0x490153,_0x3ea8bd){const _0x230f87=a0_0x1fd54d,_0x5ed4ce=(_0x42c395[_0x230f87(0x1b5)][_0x230f87(0x13e)]||TARGET_HOSTS[0x0])[_0x230f87(0x112)](':')[0x0],_0x20b0d1=await resolveTargetIP(_0x5ed4ce),_0x387d1b=https[_0x230f87(0x172)]({'hostname':_0x20b0d1,'port':0x1bb,'path':_0x42c395['url'],'method':_0x42c395[_0x230f87(0x120)],'headers':{..._0x42c395['headers'],'host':_0x5ed4ce},'servername':_0x5ed4ce,'rejectUnauthorized':![]},_0x529917=>{const _0x114ed1=_0x230f87;_0x412e06[_0x114ed1(0x158)](_0x529917['statusCode'],_0x529917['headers']);if(!_0x3ea8bd){_0x529917['pipe'](_0x412e06);return;}const _0x237412=[];_0x529917['on'](_0x114ed1(0xcd),_0x290fd5=>{const _0x26bdb4=_0x114ed1;_0x237412[_0x26bdb4(0x16f)](_0x290fd5),_0x412e06['write'](_0x290fd5);}),_0x529917['on'](_0x114ed1(0x12d),()=>{const _0x190bd5=_0x114ed1;_0x412e06[_0x190bd5(0x12d)]();try{_0x3ea8bd(Buffer[_0x190bd5(0xbb)](_0x237412),_0x529917[_0x190bd5(0x1b5)]);}catch{}});});_0x387d1b['on'](_0x230f87(0x11d),_0x1d7b9c=>{const _0x465ea6=_0x230f87;err(_0x465ea6(0x18d)+_0x1d7b9c[_0x465ea6(0xf4)]);if(!_0x412e06[_0x465ea6(0x127)])_0x412e06['writeHead'](0x1f6);_0x412e06[_0x465ea6(0x12d)](_0x465ea6(0x11e));});if(_0x490153[_0x230f87(0x188)]>0x0)_0x387d1b[_0x230f87(0xea)](_0x490153);_0x387d1b[_0x230f87(0x12d)]();}";
  const passthroughReplace =
    "async function passthrough(_0x42c395,_0x412e06,_0x490153,_0x3ea8bd){const _0x230f87=a0_0x1fd54d,_0x5ed4ce=(_0x42c395[_0x230f87(0x1b5)][_0x230f87(0x13e)]||TARGET_HOSTS[0x0])[_0x230f87(0x112)](':')[0x0],_0x20b0d1=await resolveTargetIP(_0x5ed4ce);if(TARGET_HOSTS.includes(_0x5ed4ce)&&isUnsafeLoopbackIP(_0x20b0d1)){err('Blocked self-loop passthrough for '+_0x5ed4ce+' -> '+_0x20b0d1);if(!_0x412e06[_0x230f87(0x127)])_0x412e06['writeHead'](0x1f6,{'Content-Type':'text/plain'});_0x412e06['end']('MITM self-loop prevented');return;}const _0x387d1b=https[_0x230f87(0x172)]({'hostname':_0x20b0d1,'port':0x1bb,'path':_0x42c395['url'],'method':_0x42c395[_0x230f87(0x120)],'headers':{..._0x42c395['headers'],'host':_0x5ed4ce,[INTERNAL_REQUEST_HEADER['name']]:INTERNAL_REQUEST_HEADER['value']},'servername':_0x5ed4ce,'rejectUnauthorized':![]},_0x529917=>{const _0x114ed1=_0x230f87;_0x412e06[_0x114ed1(0x158)](_0x529917['statusCode'],_0x529917['headers']);if(!_0x3ea8bd){_0x529917['pipe'](_0x412e06);return;}const _0x237412=[];_0x529917['on'](_0x114ed1(0xcd),_0x290fd5=>{const _0x26bdb4=_0x114ed1;_0x237412[_0x26bdb4(0x16f)](_0x290fd5),_0x412e06['write'](_0x290fd5);}),_0x529917['on'](_0x114ed1(0x12d),()=>{const _0x190bd5=_0x114ed1;_0x412e06[_0x190bd5(0x12d)]();try{_0x3ea8bd(Buffer[_0x190bd5(0xbb)](_0x237412),_0x529917[_0x190bd5(0x1b5)]);}catch{}});});_0x387d1b['on'](_0x230f87(0x11d),_0x1d7b9c=>{const _0x465ea6=_0x230f87;err(_0x465ea6(0x18d)+_0x1d7b9c[_0x465ea6(0xf4)]);if(!_0x412e06[_0x465ea6(0x127)])_0x412e06['writeHead'](0x1f6);_0x412e06[_0x465ea6(0x12d)](_0x465ea6(0x11e));});if(_0x490153[_0x230f87(0x188)]>0x0)_0x387d1b[_0x230f87(0xea)](_0x490153);_0x387d1b[_0x230f87(0x12d)]();}";

  if (content.includes(passthroughFind) && !content.includes("MITM self-loop prevented")) {
    content = content.replace(passthroughFind, passthroughReplace);
    console.log('- MITM server: loop prevention in passthrough');
  }

  if (content !== readFileSync(antigravityMitmServer, 'utf-8')) {
    writeFileSync(antigravityMitmServer, content, 'utf-8');
  }
}

if (dbJsonPath && existsSync(dbJsonPath)) {
  try {
    const db = JSON.parse(readFileSync(dbJsonPath, 'utf-8'));
    const antigravityAliases = db?.mitmAlias?.antigravity;

    if (antigravityAliases && typeof antigravityAliases === 'object') {
      db.modelAliases ||= {};
      let changed = false;

      for (const [alias, target] of Object.entries(antigravityAliases)) {
        if (target && db.modelAliases[alias] !== target) {
          db.modelAliases[alias] = target;
          changed = true;
        }
      }

      if (changed) {
        writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), 'utf-8');
        console.log('- db.json: mirrored Antigravity aliases into modelAliases');
      }
    }
  } catch (error) {
    console.log(`- db.json patch skipped: ${error.message}`);
  }
}

if (antigravityMainJs && existsSync(antigravityMainJs)) {
  let content = readFileSync(antigravityMainJs, 'utf-8');
  const oauthFind = 'import{OAuth2Client as M3r}from"google-auth-library";function Q3r(';
  const oauthReplace =
    'import{OAuth2Client as M3r}from"google-auth-library";import*as _9routerFs from"fs";import*as _9routerHttps from"https";import*as _9routerTls from"tls";const _9routerMitmCertPath=(process.env.APPDATA?process.env.APPDATA.replace(/\\\\/g,"/")+"/9router/mitm/rootCA.crt":"");try{if(_9routerMitmCertPath&&_9routerFs.existsSync(_9routerMitmCertPath)){const e=_9routerHttps.globalAgent.options.ca,t=Array.isArray(e)?e:e?[e]:[];_9routerHttps.globalAgent.options.ca=[..._9routerTls.rootCertificates,...t,_9routerFs.readFileSync(_9routerMitmCertPath)]}}catch(e){console.error("[9router] Failed to load MITM root CA",e)}function Q3r(';
  const oauthFindCurrent =
    'import{OAuth2Client as b0r}from"google-auth-library";import{createServer as rzn}from"http";import{shell as nzn}from"electron";import*as azn from"url";import F0r from"fs";';
  const oauthReplaceCurrent =
    'import{OAuth2Client as b0r}from"google-auth-library";import{createServer as rzn}from"http";import{shell as nzn}from"electron";import*as azn from"url";import F0r from"fs";import*as _9routerHttps from"https";import*as _9routerTls from"tls";import*as _9routerPath from"path";const _9routerMitmCertPath=process.env.APPDATA?_9routerPath.join(process.env.APPDATA,"9router","mitm","rootCA.crt"):"";try{if(_9routerMitmCertPath&&F0r.existsSync(_9routerMitmCertPath)){let e=F0r.readFileSync(_9routerMitmCertPath),t=_9routerHttps.globalAgent.options.ca,n=Array.isArray(t)?t:t?[t]:[];_9routerHttps.globalAgent.options.ca=[..._9routerTls.rootCertificates,...n,e],process.env.NODE_TLS_REJECT_UNAUTHORIZED="0"}}catch(e){console.error("[9router] Failed to load MITM root CA",e)}';

  if (content.includes(oauthFind) && !content.includes('_9routerMitmCertPath')) {
    content = content.replace(oauthFind, oauthReplace);
    writeFileSync(antigravityMainJs, content, 'utf-8');
    console.log('- Antigravity main.js: load 9router MITM root CA into https agent');
  }

  if (content.includes(oauthFindCurrent) && !content.includes('_9routerMitmCertPath')) {
    content = content.replace(oauthFindCurrent, oauthReplaceCurrent);
    writeFileSync(antigravityMainJs, content, 'utf-8');
    console.log('- Antigravity main.js: load 9router MITM root CA into https agent (current build)');
  }
}

if (antigravityExtensionJs && existsSync(antigravityExtensionJs)) {
  let content = readFileSync(antigravityExtensionJs, 'utf-8');
  const extensionUpdateFind =
    'updateUserStatus(e){const t=(0,c.create)(u.SendActionToChatPanelRequestSchema,{actionType:m.ChatActionType.updateUserStatus,payload:[(0,c.toBinary)(l.UserStatusSchema,e)]});d.LanguageServerClient.getInstance().client.sendActionToChatPanel(t)}}';
  const extensionUpdateReplace =
    'updateUserStatus(e){e=_9routerRewriteUserStatus(e);const t=(0,c.create)(u.SendActionToChatPanelRequestSchema,{actionType:m.ChatActionType.updateUserStatus,payload:[(0,c.toBinary)(l.UserStatusSchema,e)]});d.LanguageServerClient.getInstance().client.sendActionToChatPanel(t)}}';
  const extensionHelperAnchor = 't.ChatPanelProvider=p},82102:';
  const extensionHelperInsert =
    'function _9routerReadMitmModelState(){try{let e=require("fs"),t=require("path"),n=process.env.APPDATA;if(!n)return{enabled:!1,aliasMap:{}};let r=t.join(n,"9router","db.json");if(!e.existsSync(r))return{enabled:!1,aliasMap:{}};let a=JSON.parse(e.readFileSync(r,"utf-8")),o=a?.mitmAlias?.antigravity;return{enabled:!!a?.settings?.mitmEnabled,aliasMap:o&&"object"==typeof o?o:{}}}catch{return{enabled:!1,aliasMap:{}}}}function _9routerRewriteUserStatus(e){try{if(!e?.cascadeModelConfigData?.clientModelConfigs)return e;let t=_9routerReadMitmModelState();if(!t.enabled)return e;let n={},r=e.cascadeModelConfigData.clientModelConfigs.map(e=>{let r="alias"===e?.modelOrAlias?.choice?.case?e.modelOrAlias.choice.value:void 0,a=r&&t.aliasMap?.[r];if(!a)return e;let o=String(a);return n[e.label]=o,{...e,label:o}}),a=(e.cascadeModelConfigData.clientModelSorts||[]).map(e=>({...e,groups:(e.groups||[]).map(e=>({...e,modelLabels:(e.modelLabels||[]).map(e=>n[e]||e)}))}));return{...e,cascadeModelConfigData:{...e.cascadeModelConfigData,clientModelConfigs:r,clientModelSorts:a}}}catch{return e}}t.ChatPanelProvider=p},82102:';
  const userStatusUpdaterCtorFind = 'constructor(e=6e4){this._updateIntervalMs=e}';
  const userStatusUpdaterCtorReplace = 'constructor(e=1e4){this._updateIntervalMs=e}';
  const userStatusUpdaterGetInstanceFind = 'static getInstance(e=6e4){return a.instance||(a.instance=new a(e)),a.instance}';
  const userStatusUpdaterGetInstanceReplace =
    'static getInstance(e=1e4){return a.instance||(a.instance=new a(e)),a.instance}';
  const userStatusUpdaterRestartFind =
    'restartUpdateLoop(){this._intervalId&&this.stopUpdateLoop(),this.updateUserStatus(),this._intervalId=setInterval(()=>{this.updateUserStatus()},this._updateIntervalMs)}';
  const userStatusUpdaterRestartReplace =
    'restartUpdateLoop(){this._intervalId&&this.stopUpdateLoop(),setTimeout(()=>{this.updateUserStatus()},1e3),this._intervalId=setInterval(()=>{this.updateUserStatus()},this._updateIntervalMs)}';
  const metadataUpdateUserStatusFind = 'updateUserStatus(e){this._userStatus=e}';
  const metadataUpdateUserStatusReplace =
    'updateUserStatus(e){try{let t=require("fs"),n=require("path"),r=process.env.APPDATA;if(r&&e?.cascadeModelConfigData?.clientModelConfigs){let a=n.join(r,"9router","db.json");if(t.existsSync(a)){let n=JSON.parse(t.readFileSync(a,"utf-8")),r=!!n?.settings?.mitmEnabled,o=n?.mitmAlias?.antigravity;if(r&&o&&"object"==typeof o){let t={},n=e.cascadeModelConfigData.clientModelConfigs.map(e=>{let n="alias"===e?.modelOrAlias?.choice?.case?e.modelOrAlias.choice.value:void 0,r=n&&o[n];return r?(t[e.label]=String(r),{...e,label:String(r)}):e}),r=(e.cascadeModelConfigData.clientModelSorts||[]).map(e=>({...e,groups:(e.groups||[]).map(e=>({...e,modelLabels:(e.modelLabels||[]).map(e=>t[e]||e)}))}));e={...e,cascadeModelConfigData:{...e.cascadeModelConfigData,clientModelConfigs:n,clientModelSorts:r}}}}}}catch{}this._userStatus=e}';
  const updateMainThreadAuthStatusFind =
    't.updateMainThreadAuthStatus=()=>{const e=l.MetadataProvider.getInstance(),t=e.apiKey,n=e.userStatus;n&&("string"==typeof t?a.antigravityAuth.setAuthStatus({name:n.name,apiKey:t,email:n.email,userStatusProtoBinaryBase64:(0,u.protoToBinaryBase64)(c.UserStatusSchema,n)}):a.antigravityAuth.setAuthStatus(null))}';
  const updateMainThreadAuthStatusReplace =
    't.updateMainThreadAuthStatus=()=>{const e=l.MetadataProvider.getInstance(),t=e.apiKey,n=e.userStatus;n&&("string"==typeof t?a.antigravityAuth.setAuthStatus({name:n.name,apiKey:t,email:n.email,userStatusProtoBinaryBase64:(0,u.protoToBinaryBase64)(c.UserStatusSchema,n)}):a.antigravityAuth.setAuthStatus(null))}';

  if (content.includes(extensionUpdateFind) && !content.includes('_9routerRewriteUserStatus(e)')) {
    content = content.replace(extensionUpdateFind, extensionUpdateReplace);
    console.log('- Antigravity extension: rewrite chat model labels from 9router MITM aliases');
  }

  if (content.includes(extensionHelperAnchor) && !content.includes('function _9routerRewriteUserStatus(')) {
    content = content.replace(extensionHelperAnchor, extensionHelperInsert);
    console.log('- Antigravity extension: load MITM alias state from db.json');
  }

  if (
    content.includes(userStatusUpdaterCtorFind) &&
    !content.includes('constructor(e=1e4){this._updateIntervalMs=e}')
  ) {
    content = content.replace(userStatusUpdaterCtorFind, userStatusUpdaterCtorReplace);
    console.log('- Antigravity extension: shorten user status refresh constructor default to 10s');
  }

  if (
    content.includes(userStatusUpdaterGetInstanceFind) &&
    !content.includes('static getInstance(e=1e4){return a.instance||(a.instance=new a(e)),a.instance}')
  ) {
    content = content.replace(
      userStatusUpdaterGetInstanceFind,
      userStatusUpdaterGetInstanceReplace
    );
    console.log('- Antigravity extension: shorten user status refresh interval to 10s');
  }

  if (
    content.includes(userStatusUpdaterRestartFind) &&
    !content.includes('setTimeout(()=>{this.updateUserStatus()},1e3)')
  ) {
    content = content.replace(
      userStatusUpdaterRestartFind,
      userStatusUpdaterRestartReplace
    );
    console.log(
      '- Antigravity extension: delay first user status refresh until LanguageServerClient is ready'
    );
  }

  if (
    content.includes(metadataUpdateUserStatusFind) &&
    !content.includes('let t=require("fs"),n=require("path"),r=process.env.APPDATA;if(r&&e?.cascadeModelConfigData?.clientModelConfigs)')
  ) {
    content = content.replace(metadataUpdateUserStatusFind, metadataUpdateUserStatusReplace);
    console.log('- Antigravity extension: rewrite stored userStatus labels from 9router MITM aliases');
  }

  if (
    content.includes(updateMainThreadAuthStatusFind) &&
    !content.includes('userStatusProtoBinaryBase64:(0,u.protoToBinaryBase64)(c.UserStatusSchema,n)')
  ) {
    content = content.replace(updateMainThreadAuthStatusFind, updateMainThreadAuthStatusReplace);
  }

  if (content !== readFileSync(antigravityExtensionJs, 'utf-8')) {
    writeFileSync(antigravityExtensionJs, content, 'utf-8');
  }
}

if (antigravityChatJs && existsSync(antigravityChatJs)) {
  let content = readFileSync(antigravityChatJs, 'utf-8');
  const chatHelperAnchor = 'const{URI:q6e,Utils:$6e}=z6e,e8e=';
  const chatLegacyHelperPrefix = 'const{URI:q6e,Utils:$6e}=z6e;let _9routerModelLabelCache={ts:0,map:null};';
  const chatHelperInsert = `const{URI:q6e,Utils:$6e}=z6e;let _9routerModelLabelCache={ts:0,map:null},_9routerDbStateCache={ts:0,state:{enabled:!1,aliasMap:{}}};function _9routerFriendlyAliasForLabel(e){switch(e){case"Gemini 3.1 Pro (High)":return"gemini-3.1-pro-high";case"Gemini 3.1 Pro (Low)":return"gemini-3.1-pro-low";case"Gemini 3 Flash":return"gemini-3-flash";case"Claude Sonnet 4.6 (Thinking)":return"claude-sonnet-4-6";case"Claude Opus 4.6 (Thinking)":return"claude-opus-4-6-thinking";case"GPT-OSS 120B (Medium)":return"gpt-oss-120b-medium";default:return void 0}}function _9routerFriendlyLabelMap(){return{"Gemini 3.1 Pro (High)":"gemini-3.1-pro-high","Gemini 3.1 Pro (Low)":"gemini-3.1-pro-low","Gemini 3 Flash":"gemini-3-flash","Claude Sonnet 4.6 (Thinking)":"claude-sonnet-4-6","Claude Opus 4.6 (Thinking)":"claude-opus-4-6-thinking","GPT-OSS 120B (Medium)":"gpt-oss-120b-medium"}}function _9routerGetMitmStateSync(){try{let e=Date.now();if(_9routerDbStateCache.state&&e-_9routerDbStateCache.ts<5e3)return _9routerDbStateCache.state;let t=window?.require?.("fs"),n=window?.require?.("path"),r=(window?.process?.env?.APPDATA)||window?.__ANTIGRAVITY_APP_DATA_PATH__;if(!t||!n||!r)return _9routerDbStateCache.state;let a=n.join(r,"9router","db.json");if(!t.existsSync(a))return _9routerDbStateCache={ts:e,state:{enabled:!1,aliasMap:{}}},_9routerDbStateCache.state;let o=JSON.parse(t.readFileSync(a,"utf-8")),i={enabled:!!o?.settings?.mitmEnabled,aliasMap:o?.mitmAlias?.antigravity&&"object"==typeof o.mitmAlias.antigravity?o.mitmAlias.antigravity:{}};return _9routerDbStateCache={ts:e,state:i},i}catch{return _9routerDbStateCache.state}}function _9routerRewriteModelLabel(e,t){try{let n=_9routerGetMitmStateSync();if(!n?.enabled)return e;let r=t||_9routerFriendlyAliasForLabel(e),a=r&&n.aliasMap?.[r];return a?String(a):e}catch{return e}}function _9routerGetDomLabelPairs(){try{let e=_9routerFriendlyLabelMap(),t=_9routerGetMitmStateSync(),n=[];for(let[r,a]of Object.entries(e)){let o=t?.aliasMap?.[a];t?.enabled?o&&o!==r&&n.push([r,String(o)]):o&&o!==r&&n.push([String(o),r])}return n}catch{return[]}}function _9routerRewriteDomLabels(e){try{if(!e?.querySelectorAll)return;let t=_9routerGetDomLabelPairs();if(!t.length)return;for(let n of e.querySelectorAll("span,div")){if(n.children.length>0)continue;let e=n.textContent?.trim();if(!e)continue;for(let[r,a]of t)if(e===r){n.textContent=a;break}}}catch{}}function _9routerInstallDomLabelObserver(){try{if(window.__9routerDomLabelObserverInstalled)return;window.__9routerDomLabelObserverInstalled=!0;let e=()=>{let e=document.body||document.documentElement;e&&_9routerRewriteDomLabels(e)},t=()=>{e();let t=new MutationObserver(()=>{e()});(document.body||document.documentElement)&&t.observe(document.body||document.documentElement,{childList:!0,subtree:!0,characterData:!0}),setInterval(e,1500)};"loading"===document.readyState?document.addEventListener("DOMContentLoaded",t,{once:!0}):t()}catch{}}async function _9routerGetModelLabelMap(){try{let e=Date.now();if(_9routerModelLabelCache.map&&e-_9routerModelLabelCache.ts<5e3)return _9routerModelLabelCache.map;let t=await fetch("https://daily-cloudcode-pa.googleapis.com/v1beta/models");if(!t.ok)throw new Error("model fetch failed");let n=await t.json(),r={};for(let e of n?.models||[]){let t=e?.name,n=e?.displayName;"string"==typeof t&&t.startsWith("models/")&&"string"==typeof n&&(r[t.slice(7)]=n)}return _9routerModelLabelCache={ts:e,map:r},r}catch{return _9routerModelLabelCache.map??{}}}async function _9routerRewriteUserStatusAsync(e){try{if(!e?.cascadeModelConfigData?.clientModelConfigs)return e;let t=await _9routerGetModelLabelMap();let n=!1,r={},a=e.cascadeModelConfigData.clientModelConfigs.map(e=>{let a="alias"===e?.modelOrAlias?.choice?.case?e.modelOrAlias.choice.value:void 0,o=a&&t?.[a],i=_9routerRewriteModelLabel(o||e.label,a);if(!i||i===e.label)return e;n=!0,r[e.label]=i;return{...e,label:i}});if(!n)return e;let o=(e.cascadeModelConfigData.clientModelSorts||[]).map(e=>({...e,groups:(e.groups||[]).map(e=>({...e,modelLabels:(e.modelLabels||[]).map(e=>r[e]||_9routerRewriteModelLabel(e))}))}));return{...e,cascadeModelConfigData:{...e.cascadeModelConfigData,clientModelConfigs:a,clientModelSorts:o}}}catch{return e}}_9routerInstallDomLabelObserver();e8e=`;
  const chatUpdateStreamFind =
    'Jtt("sendActionToChatPanel",i),Jtt("sendActionToChatPanel",e=>{if("updateUserStatus"!==e.actionType)return;const t=e.payload[0],r=t?pn(x_e,t):void 0;r&&n?.(r)});';
  const chatUpdateStreamReplace =
    'Jtt("sendActionToChatPanel",i),Jtt("sendActionToChatPanel",e=>{if("updateUserStatus"!==e.actionType)return;const t=e.payload[0],r=t?pn(x_e,t):void 0;r&&_9routerRewriteUserStatusAsync(r).then(e=>{e&&n?.(e)})});';
  const chatInitialFetchFind =
    'const[g]=(0,d.useState)(U6e.DISCONNECTED),y=W6e(),{clientType:A}=W6e(),{hasDevExtension:E}=y,[b,R]=(0,d.useState)(null),[v,V]=(0,d.useState)(),[x,S]=(0,d.useState)(!1),{getUserStatus:N,shouldEnableUnleash:k,getProfileData:I,getWebDocsOptions:C}=e8(),T=(0,d.useCallback)(async()=>{if(y.apiKey)try{const e=_6e(y),t=N({metadata:e}),n=k(),[r,a]=await Promise.all([t,n]);V(e=>r.userStatus&&K6(x_e,r.userStatus,e)?e:r.userStatus),S(a.shouldEnable);const o=await I({apiKey:y.apiKey});R(o.profilePictureUrl)}catch(e){console.error(e)}}';
  const chatInitialFetchReplace =
    'const[g]=(0,d.useState)(U6e.DISCONNECTED),y=W6e(),{clientType:A}=W6e(),{hasDevExtension:E}=y,[b,R]=(0,d.useState)(null),[v,V]=(0,d.useState)(),[x,S]=(0,d.useState)(!1),{getUserStatus:N,shouldEnableUnleash:k,getProfileData:I,getWebDocsOptions:C}=e8(),T=(0,d.useCallback)(async()=>{if(y.apiKey)try{const e=_6e(y),t=N({metadata:e}),n=k(),[r,a]=await Promise.all([t,n]),o=r.userStatus?await _9routerRewriteUserStatusAsync(r.userStatus):void 0;V(e=>o&&K6(x_e,o,e)?e:o),S(a.shouldEnable);const i=await I({apiKey:y.apiKey});R(i.profilePictureUrl)}catch(e){console.error(e)}}';
  const chatRefreshFind =
    'v=(0,d.useCallback)(async()=>{if(m.apiKey)try{const e=_6e(m),t=await y({metadata:e});t.userStatus&&g?.(t.userStatus)}catch(e){console.error("Failed to fetch user status:",e)}}';
  const chatRefreshReplace =
    'v=(0,d.useCallback)(async()=>{if(m.apiKey)try{const e=_6e(m),t=await y({metadata:e});if(t.userStatus){let e=await _9routerRewriteUserStatusAsync(t.userStatus);e&&g?.(e)}}catch(e){console.error("Failed to fetch user status:",e)}}';
  const chatEneFind =
    'ene=e=>{if(!e.modelOrAlias)return null;let t="model"===e.modelOrAlias.choice.case?e.modelOrAlias.choice.value:kH.UNSPECIFIED,n="alias"===e.modelOrAlias.choice.case?e.modelOrAlias.choice.value:void 0;return{label:e.label,value:t,modelAlias:n,disabled:e.disabled,supportsImages:e.supportsImages,supportedMimeTypes:new Map(Object.entries(e.supportedMimeTypes)),betaWarningMessage:e.betaWarningMessage,isBeta:e.isBeta,pricingType:e.pricingType,description:e.description,quotaInfo:e.quotaInfo,tagTitle:e.tagTitle,tagDescription:e.tagDescription}}';
  const chatEneReplace =
    'ene=e=>{if(!e.modelOrAlias)return null;let t="model"===e.modelOrAlias.choice.case?e.modelOrAlias.choice.value:kH.UNSPECIFIED,n="alias"===e.modelOrAlias.choice.case?e.modelOrAlias.choice.value:void 0;return{label:_9routerRewriteModelLabel(e.label,n),value:t,modelAlias:n,disabled:e.disabled,supportsImages:e.supportsImages,supportedMimeTypes:new Map(Object.entries(e.supportedMimeTypes)),betaWarningMessage:e.betaWarningMessage,isBeta:e.isBeta,pricingType:e.pricingType,description:e.description,quotaInfo:e.quotaInfo,tagTitle:e.tagTitle,tagDescription:e.tagDescription}}';
  const guiProbeModelLabels = [];

  if (content.includes(chatHelperAnchor) && !content.includes('function _9routerRewriteModelLabel(')) {
    content = content.replace(chatHelperAnchor, chatHelperInsert);
    console.log('- Antigravity chat.js: add dynamic model label rewrite helper');
  }

  if (
    content.includes(chatLegacyHelperPrefix) &&
    !content.includes('function _9routerRewriteModelLabel(')
  ) {
    content = content.replace(
      /const\{URI:q6e,Utils:\$6e\}=z6e;let _9routerModelLabelCache=\{ts:0,map:null\};[\s\S]*?e8e=/,
      chatHelperInsert
    );
    console.log('- Antigravity chat.js: upgrade legacy helper to sync MITM-aware label rewrite helper');
  }

  if (
    content.includes('function _9routerRewriteModelLabel(') &&
    !content.includes('function _9routerInstallDomLabelObserver(')
  ) {
    content = content.replace(
      /const\{URI:q6e,Utils:\$6e\}=z6e;[\s\S]*?e8e=/,
      chatHelperInsert
    );
    console.log('- Antigravity chat.js: upgrade helper with DOM label observer');
  }

  if (content.includes(chatUpdateStreamFind) && !content.includes('_9routerRewriteUserStatusAsync(r).then')) {
    content = content.replace(chatUpdateStreamFind, chatUpdateStreamReplace);
    console.log('- Antigravity chat.js: rewrite streamed user status before updating UI state');
  }

  if (content.includes(chatInitialFetchFind) && !content.includes('o=r.userStatus?await _9routerRewriteUserStatusAsync(r.userStatus):void 0')) {
    content = content.replace(chatInitialFetchFind, chatInitialFetchReplace);
    console.log('- Antigravity chat.js: rewrite initial user status fetch before hydrating UI');
  }

  if (content.includes(chatRefreshFind) && !content.includes('let e=await _9routerRewriteUserStatusAsync(t.userStatus);e&&g?.(e)')) {
    content = content.replace(chatRefreshFind, chatRefreshReplace);
    console.log('- Antigravity chat.js: rewrite refresh-model user status fetch before updating UI');
  }

  if (content.includes(chatEneFind) && !content.includes('label:_9routerRewriteModelLabel(e.label,n)')) {
    content = content.replace(chatEneFind, chatEneReplace);
    console.log('- Antigravity chat.js: rewrite model option labels at option-construction point');
  }

  if (content.includes('e8e=e8e=')) {
    content = content.replace('e8e=e8e=', 'e8e=');
    console.log('- Antigravity chat.js: cleanup helper insertion join point');
  }

  for (const [fromLabel, toLabel] of guiProbeModelLabels) {
    if (!content.includes(fromLabel)) continue;
    const hitCount = content.split(fromLabel).length - 1;
    content = content.split(fromLabel).join(toLabel);
    console.log(`- Antigravity chat.js: GUI probe relabel ${fromLabel} -> ${toLabel} (${hitCount} hits)`);
  }

  if (content !== readFileSync(antigravityChatJs, 'utf-8')) {
    writeFileSync(antigravityChatJs, content, 'utf-8');
  }
}

const antigravityWorkbenchLabelHelper =
  '_9routerWorkbenchMitmState={ts:0,enabled:void 0,aliasMap:{},pending:null},_9routerWorkbenchFriendlyMap=function(){return{"Gemini 3.1 Pro (High)":"gemini-3.1-pro-high","Gemini 3.1 Pro (Low)":"gemini-3.1-pro-low","Gemini 3 Flash":"gemini-3-flash","Claude Sonnet 4.6 (Thinking)":"claude-sonnet-4-6","Claude Opus 4.6 (Thinking)":"claude-opus-4-6-thinking","GPT-OSS 120B (Medium)":"gpt-oss-120b-medium"}},_9routerWorkbenchAliasToLabel=function(e){switch(e){case"gemini-3.1-pro-high":return"Gemini 3.1 Pro (High)";case"gemini-3.1-pro-low":return"Gemini 3.1 Pro (Low)";case"gemini-3-flash":return"Gemini 3 Flash";case"claude-sonnet-4-6":return"Claude Sonnet 4.6 (Thinking)";case"claude-opus-4-6-thinking":return"Claude Opus 4.6 (Thinking)";case"gpt-oss-120b-medium":return"GPT-OSS 120B (Medium)";default:return void 0}},_9routerWorkbenchLabelToAlias=function(e){return _9routerWorkbenchFriendlyMap()[e]},_9routerWorkbenchLoadState=async function(){try{let e=Date.now();if(_9routerWorkbenchMitmState.pending)return _9routerWorkbenchMitmState.pending;if(e-_9routerWorkbenchMitmState.ts<1500)return _9routerWorkbenchMitmState;let t=(async()=>{try{let e=await fetch("http://127.0.0.1:20128/api/v1beta/models",{cache:"no-store",mode:"cors"});if(!e.ok)throw new Error("9router models unavailable");let t=await e.json(),i={..._9routerWorkbenchMitmState.aliasMap};for(let e of t?.models||[]){let t=e?.name,n=e?.displayName;if("string"==typeof t&&t.startsWith("models/")){let e=t.slice(7),r=_9routerWorkbenchAliasToLabel(e);r&&"string"==typeof n&&n.trim()&&(i[e]=n.trim())}}_9routerWorkbenchMitmState={ts:Date.now(),enabled:!!t?._9router?.antigravityMitmEnabled,aliasMap:i,pending:null}}catch{_9routerWorkbenchMitmState={..._9routerWorkbenchMitmState,ts:Date.now(),enabled:!1,pending:null}}return _9routerWorkbenchMitmState})();return _9routerWorkbenchMitmState={..._9routerWorkbenchMitmState,pending:t},t}catch{return _9routerWorkbenchMitmState}},_9routerWorkbenchGetRewritePairs=function(){try{let e=[],t=_9routerWorkbenchFriendlyMap();for(let[i,n]of Object.entries(t)){let t=_9routerWorkbenchMitmState.aliasMap?.[n],r=_9routerWorkbenchMitmState.enabled&&t?String(t):i;for(let o of[i,n,t])o&&String(o)!==r&&e.push([String(o),r])}return e}catch{return[]}},_9routerWorkbenchRewriteDomLabels=function(e){try{if(!e?.querySelectorAll)return;let t=_9routerWorkbenchGetRewritePairs();if(!t.length)return;for(let i of e.querySelectorAll("span,div")){if(i.children.length>0)continue;let e=i.textContent?.trim();if(!e)continue;for(let[n,r]of t)if(e===n&&e!==r){i.textContent=r;break}}}catch{}},_9routerWorkbenchInstallObserver=function(){try{if(globalThis.__9routerWorkbenchObserverInstalled)return;globalThis.__9routerWorkbenchObserverInstalled=!0;let e=()=>_9routerWorkbenchLoadState().then(()=>_9routerWorkbenchRewriteDomLabels(document.body||document.documentElement)),t=()=>{e();let t=new MutationObserver(()=>_9routerWorkbenchRewriteDomLabels(document.body||document.documentElement));(document.body||document.documentElement)&&t.observe(document.body||document.documentElement,{childList:!0,subtree:!0,characterData:!0}),setInterval(e,2e3)};"loading"===document.readyState?document.addEventListener("DOMContentLoaded",t,{once:!0}):t()}catch{}},_9routerWorkbenchModelLabel=function(e,t){try{let i=_9routerWorkbenchLabelToAlias(e)||t;return(!_9routerWorkbenchMitmState.pending&&(Date.now()-_9routerWorkbenchMitmState.ts>1500||void 0===_9routerWorkbenchMitmState.enabled))&&_9routerWorkbenchLoadState().then(()=>_9routerWorkbenchRewriteDomLabels(document.body||document.documentElement)),i&&_9routerWorkbenchMitmState.enabled&&_9routerWorkbenchMitmState.aliasMap?.[i]?String(_9routerWorkbenchMitmState.aliasMap[i]):e}catch{return e}},_9routerWorkbenchObserverBootstrap=_9routerWorkbenchInstallObserver()';

if (antigravityWorkbenchJs && existsSync(antigravityWorkbenchJs)) {
  let content = readFileSync(antigravityWorkbenchJs, 'utf-8');
  const workbenchConverterFind =
    ',Oan=t=>{if(!t.modelOrAlias)return null;let e=t.modelOrAlias.choice.case==="model"?t.modelOrAlias.choice.value:gz.UNSPECIFIED,i=t.modelOrAlias.choice.case==="alias"?t.modelOrAlias.choice.value:void 0;return{label:t.label,value:e,modelAlias:i,disabled:t.disabled,supportsImages:t.supportsImages,supportedMimeTypes:new Map(Object.entries(t.supportedMimeTypes)),betaWarningMessage:t.betaWarningMessage,isBeta:t.isBeta,pricingType:t.pricingType,description:t.description,quotaInfo:t.quotaInfo,tagTitle:t.tagTitle,tagDescription:t.tagDescription}}';
  const workbenchConverterHelperFind =
    ',Oan=t=>{if(!t.modelOrAlias)return null;let e=t.modelOrAlias.choice.case==="model"?t.modelOrAlias.choice.value:gz.UNSPECIFIED,i=t.modelOrAlias.choice.case==="alias"?t.modelOrAlias.choice.value:void 0;return{label:_9routerWorkbenchModelLabel(t.label),value:e,modelAlias:i,disabled:t.disabled,supportsImages:t.supportsImages,supportedMimeTypes:new Map(Object.entries(t.supportedMimeTypes)),betaWarningMessage:t.betaWarningMessage,isBeta:t.isBeta,pricingType:t.pricingType,description:t.description,quotaInfo:t.quotaInfo,tagTitle:t.tagTitle,tagDescription:t.tagDescription}}';
  const workbenchConverterHelperWithAliasFind =
    ',Oan=t=>{if(!t.modelOrAlias)return null;let e=t.modelOrAlias.choice.case==="model"?t.modelOrAlias.choice.value:gz.UNSPECIFIED,i=t.modelOrAlias.choice.case==="alias"?t.modelOrAlias.choice.value:void 0;return{label:_9routerWorkbenchModelLabel(t.label,i),value:e,modelAlias:i,disabled:t.disabled,supportsImages:t.supportsImages,supportedMimeTypes:new Map(Object.entries(t.supportedMimeTypes)),betaWarningMessage:t.betaWarningMessage,isBeta:t.isBeta,pricingType:t.pricingType,description:t.description,quotaInfo:t.quotaInfo,tagTitle:t.tagTitle,tagDescription:t.tagDescription}}';
  const workbenchConverterReplace =
    `,${antigravityWorkbenchLabelHelper},Oan=t=>{if(!t.modelOrAlias)return null;let e=t.modelOrAlias.choice.case==="model"?t.modelOrAlias.choice.value:gz.UNSPECIFIED,i=t.modelOrAlias.choice.case==="alias"?t.modelOrAlias.choice.value:void 0;return{label:_9routerWorkbenchModelLabel(t.label,i),value:e,modelAlias:i,disabled:t.disabled,supportsImages:t.supportsImages,supportedMimeTypes:new Map(Object.entries(t.supportedMimeTypes)),betaWarningMessage:t.betaWarningMessage,isBeta:t.isBeta,pricingType:t.pricingType,description:t.description,quotaInfo:t.quotaInfo,tagTitle:t.tagTitle,tagDescription:t.tagDescription}}`;

  content = content
    .replace(
      /_9routerGuiProbeLabel=e=>\{switch\(e\)\{case"Gemini 3\.1 Pro \(High\)":return"model 0";case"Gemini 3\.1 Pro \(Low\)":return"model 1";case"Gemini 3 Flash":return"model 2";case"Claude Sonnet 4\.6 \(Thinking\)":return"model 3";case"Claude Opus 4\.6 \(Thinking\)":return"model 4";case"GPT-OSS 120B \(Medium\)":return"model 5";default:return e\}\},?/,
      ''
    )
    .replace('label:"[WB] "+t.label', 'label:t.label')
    .replace('label:_9routerGuiProbeLabel(t.label)', 'label:t.label')
    .replace(/,let _9routerWorkbenchMitmState=\{[\s\S]*?_9routerWorkbenchInstallObserver\(\),/, ',')
    .replace(/_9routerWorkbenchModelLabel=e=>\{[\s\S]*?default:return e\}\},?/,'')
    .replace('label:_9routerWorkbenchModelLabel(t.label)', 'label:_9routerWorkbenchModelLabel(t.label,i)');

  if (
    content.includes(workbenchConverterFind) &&
    !content.includes('_9routerWorkbenchInstallObserver()')
  ) {
    content = content.replace(workbenchConverterFind, workbenchConverterReplace);
    console.log('- Antigravity workbench: install dynamic 9router-backed GUI label sync');
  }

  if (
    content.includes(workbenchConverterHelperFind) &&
    !content.includes('_9routerWorkbenchInstallObserver()')
  ) {
    content = content.replace(workbenchConverterHelperFind, workbenchConverterReplace);
    console.log('- Antigravity workbench: upgrade hardcoded GUI labels to dynamic 9router-backed sync');
  }

  if (
    content.includes(workbenchConverterHelperWithAliasFind) &&
    !content.includes('_9routerWorkbenchInstallObserver()')
  ) {
    content = content.replace(workbenchConverterHelperWithAliasFind, workbenchConverterReplace);
    console.log('- Antigravity workbench: inject missing dynamic helper for existing alias-aware label hook');
  }

  if (content !== readFileSync(antigravityWorkbenchJs, 'utf-8')) {
    writeFileSync(antigravityWorkbenchJs, content, 'utf-8');
  }
}
