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

  // Exercise the real 11-shelf late-game board at compact phone and tablet viewports.
  const fitContext = await browser.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true});
  await fitContext.addInitScript(()=>{localStorage.setItem('nbsLevel','56');localStorage.setItem('nbsUnlocked','56')});
  const fitPage = await fitContext.newPage();
  const fitErrors = [];
  fitPage.on('pageerror',error=>fitErrors.push(error.message));
  await fitPage.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await fitPage.locator('#start').click();
  await fitPage.locator('#briefStart').click();
  await fitPage.locator('#levelBrief').waitFor({state:'hidden'});
  const fitShelves = fitPage.locator('#shelves button.shelf');
  assert.equal(await fitShelves.count(),11,'Level 56 must render all eleven shelves');
  for (const viewport of [{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:1024,height:768}]) {
    await fitPage.setViewportSize(viewport);
    await fitPage.waitForTimeout(80);
    const fit = await fitPage.evaluate(()=>{
      const root=document.querySelector('#shelves'), board=document.querySelector('.board-wrap');
      const rows=[...root.querySelectorAll('.shelf')];
      const last=rows.at(-1), rr=root.getBoundingClientRect(), lr=last.getBoundingClientRect(), br=board.getBoundingClientRect();
      return {count:rows.length,scrollHeight:root.scrollHeight,clientHeight:root.clientHeight,rootBottom:rr.bottom,lastBottom:lr.bottom,boardBottom:br.bottom,rootTop:rr.top,firstTop:rows[0].getBoundingClientRect().top,rowHeights:rows.map(x=>x.getBoundingClientRect().height),artWidth:root.querySelector('.produce-art')?.getBoundingClientRect().width||0,labelRight:rows[0].querySelector('.shelf-label').getBoundingClientRect().right,slotsLeft:rows[0].querySelector('.slots').getBoundingClientRect().left,labelText:rows[0].querySelector('.shelf-label').textContent,coarse:matchMedia('(pointer:coarse)').matches};
    });
    assert.equal(fit.count,11,'All eleven shelves must remain rendered at '+JSON.stringify(viewport));
    assert.ok(fit.scrollHeight<=fit.clientHeight+2,'Shelf list must not require scrolling at '+JSON.stringify(viewport)+': '+JSON.stringify(fit));
    assert.ok(fit.lastBottom<=fit.boardBottom+2,'Last shelf must fit inside the board at '+JSON.stringify(viewport)+': '+JSON.stringify(fit));
    assert.ok(fit.rowHeights.every(height=>height>=20),'Shelf rows must remain usable at '+JSON.stringify(viewport)+': '+JSON.stringify(fit));
    assert.ok(fit.artWidth>=19,'Produce artwork must remain recognisable at '+JSON.stringify(viewport)+': '+JSON.stringify(fit));
    assert.ok(fit.labelRight<=fit.slotsLeft,'Shelf labels must not overlap product slots at '+JSON.stringify(viewport)+': '+JSON.stringify(fit));
    assert.ok(fit.labelText.includes('SHELF 1'),'Shelf number must remain visible at '+JSON.stringify(viewport)+': '+JSON.stringify(fit));
  }
  assert.deepEqual(fitErrors,[],'Late-game layout must not emit JavaScript errors');
  console.log('PASS: Level 56 eleven-shelf layout fits compact phone and tablet viewports without shelf scrolling.');
  await fitContext.close();
  await context.close();
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
