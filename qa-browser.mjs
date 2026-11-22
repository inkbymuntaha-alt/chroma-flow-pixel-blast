import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),rel=p==='/'?'index.html':p.slice(1),file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end();return}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(d)})});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const viewport of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:412,height:915},{width:768,height:1024}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<600,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('#menu').waitFor({state:'visible'});
  await page.waitForTimeout(1500);const canvas=await page.locator('#world3d').boundingBox().catch(()=>null);const fallback=await page.locator('#world').boundingBox();assert.ok((canvas&&canvas.width>0&&canvas.height>0)||(fallback&&fallback.width>0&&fallback.height>0),'3D or fallback canvas visible '+JSON.stringify(viewport));
  await page.locator('#play').click();await page.locator('#menu').waitFor({state:'hidden'});
  await page.locator('#hud').waitFor({state:'visible'});
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(500);await page.keyboard.up('ArrowUp');
  assert.ok(await page.evaluate(()=>window.__bikeRaceTest.state.speed>0),'Throttle accelerates');
  const speed=await page.evaluate(()=>window.__bikeRaceTest.state.speed);
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(400);await page.keyboard.up('ArrowDown');
  assert.ok(await page.evaluate(s=>window.__bikeRaceTest.state.speed<s,speed),'Brake input processed');
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(120);await page.keyboard.up('ArrowLeft');
  assert.ok(await page.evaluate(()=>window.__bikeRaceTest.state.playerX<0),'Steering left moves bike');
  await page.locator('#pause').click();await page.locator('#pauseScreen').waitFor({state:'visible'});
  await page.locator('#resume').click();await page.locator('#pauseScreen').waitFor({state:'hidden'});
  await page.evaluate(()=>window.__bikeRaceTest.finish());await page.locator('#result').waitFor({state:'visible'});
  await page.locator('#again').click();await page.locator('#result').waitFor({state:'hidden'});
  assert.deepEqual(errors,[],'No uncaught browser errors');
  await context.close();
 }
 console.log('PASS: motorcycle racing browser smoke tests — five viewports, start, throttle, brake, steering, pause/resume, race finish and replay.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
