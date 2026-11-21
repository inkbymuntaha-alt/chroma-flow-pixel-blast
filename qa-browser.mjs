import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root,relative);
  if(!file.startsWith(root + path.sep) && file !== path.join(root,'index.html')){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
let browser;
try {
  browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#welcome').waitFor({state:'visible'});
  await page.locator('#start').click();
  await page.locator('#levelBrief').waitFor({state:'visible'});
  await page.locator('#briefStart').click();
  await page.locator('#levelBrief').waitFor({state:'hidden'});
  const shelves = page.locator('#shelves button.shelf');
  await shelves.first().waitFor({state:'visible'});
  assert.equal(await shelves.count(),4,'Level 1 must render 4 shelves');
  const sourceIndex = await shelves.evaluateAll(nodes => nodes.findIndex(node => !node.getAttribute('aria-label')?.endsWith('0 of 4 items')));
  assert.ok(sourceIndex >= 0, 'Puzzle must have at least one non-empty shelf');
  const source = shelves.nth(sourceIndex);
  await source.click();
  await assert.doesNotReject(async()=>page.locator('#shelves button.shelf.selected').waitFor({state:'visible'}),'Shelf tap must select a shelf');
  const legalTarget = page.locator('#shelves button.shelf.target').first();
  await legalTarget.waitFor({state:'visible'});
  await legalTarget.click();
  await page.waitForFunction(()=>document.querySelector('#moves')?.textContent==='1');
  await page.locator('#undo').click();
  await page.waitForFunction(()=>document.querySelector('#moves')?.textContent==='0');
  await page.locator('#hint').click();
  await page.locator('#shelves button.shelf.selected').waitFor({state:'visible'});
  await page.locator('#shuffle').click();
  await page.locator('#shelves button.shelf').first().waitFor({state:'visible'});
  await page.locator('#restart').click();
  await page.locator('#levelBrief').waitFor({state:'visible'});
  await page.locator('#briefStart').click();
  await page.locator('#shelves button.shelf').first().waitFor({state:'visible'});
  assert.deepEqual(pageErrors,[],'Browser must not emit uncaught JavaScript errors');
  console.log('PASS: Android-sized browser smoke test — launch, level start, shelf selection, legal move, undo, hint, mix-up, restart, and no uncaught page errors.');
  await context.close();
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
