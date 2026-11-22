import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),rel=p==='/'?'index.html':p.replace(/^\/+/,''),file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end();return}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(d)})});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:412,height:915},{width:768,height:1024}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<600,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#menu').waitFor({state:'visible'});
  const canvas=await page.locator('#world').boundingBox();assert.ok(canvas&&canvas.width>0&&canvas.height>0,'Canvas fills screen '+JSON.stringify(viewport));
  await page.locator('#play').click();
  await page.locator('#menu').waitFor({state:'hidden'});
  await page.locator('#score').waitFor({state:'visible'});
  const initial=await page.evaluate(()=>window.__marketRushTest.state.lane);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(()=>window.__marketRushTest.state.lane),Math.max(0,initial-1),'Keyboard lane movement works');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  assert.ok(await page.evaluate(()=>window.__marketRushTest.state.jump>0),'Jump action works');
  await page.evaluate(()=>{window.__marketRushTest.state.jump=0});
  await page.keyboard.press('ArrowDown');
  assert.ok(await page.evaluate(()=>window.__marketRushTest.state.slide>0),'Slide action works');
  await page.locator('#pause').click();await page.locator('#pauseScreen').waitFor({state:'visible'});
  await page.locator('#resume').click();await page.locator('#pauseScreen').waitFor({state:'hidden'});
  await page.evaluate(()=>{const t=window.__marketRushTest;t.state.lane=1;t.state.objects=[{lane:1,z:.85,kind:'fruit',icon:'🍎',hit:false}];t.update(.1)});
  assert.equal(await page.evaluate(()=>window.__marketRushTest.state.delivered),1,'Collecting a fruit advances the customer order');
  assert.equal(await page.evaluate(()=>window.__marketRushTest.state.runCoins),2,'Collecting goods rewards coins');
  await page.evaluate(()=>{const t=window.__marketRushTest;t.state.jump=0;t.state.slide=0;t.state.objects=[{lane:t.state.lane,z:.85,kind:'crate',hit:false}];t.update(.1)});
  await page.locator('#gameover').waitFor({state:'visible'});
  await page.locator('#again').click();await page.locator('#gameover').waitFor({state:'hidden'});
  assert.deepEqual(errors,[],'No uncaught browser errors');
  await context.close();
 }
 console.log('PASS: Playwright mobile/tablet smoke tests — menu, start, lane controls, jump, slide, pause/resume, collect order goods, coin rewards, obstacle collision, restart and responsive canvas across five viewports.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
