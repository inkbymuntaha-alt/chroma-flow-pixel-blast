import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const scriptStart = html.indexOf('<script>') + 8;
const scriptEnd = html.indexOf('</script>', scriptStart);
assert.ok(scriptStart >= 8 && scriptEnd > scriptStart, 'Main game script must exist');
const js = html.slice(scriptStart, scriptEnd);
new Function(js);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
const idSet = new Set(ids);
const selectors = [...js.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const missing = [...new Set(selectors.filter(id => !idSet.has(id)))];
assert.deepEqual(missing, [], 'Every direct UI selector must have an HTML element');

assert.equal(manifest.name, 'Nazeef Bazar Sort Stories');
assert.deepEqual(manifest.display_override, ['fullscreen', 'standalone'], 'Installed Android app should prefer immersive fullscreen with standalone fallback');
assert.ok(manifest.icons.some(icon => icon.src === './icon.svg'));
for (const asset of ['./index.html', './manifest.webmanifest', './icon.svg']) {
  assert.ok(sw.includes(asset), 'Service worker must precache ' + asset);
}
assert.ok(sw.includes('self.skipWaiting()'));
assert.ok(sw.includes('self.clients.claim()'));
assert.ok(js.includes("if(!dailyMode&&!worldBonusPaid)"), 'Daily mode must not consume normal chapter rewards');
assert.ok(js.includes("'nbsWorldPerkClaims'"), 'Chapter reward claims must be persisted');
assert.ok(js.includes('Math.min(10,3+Math.floor((level-1)/4))'), 'Progression must support ten product types');
const extract = (pattern, label) => {
  const match = js.match(pattern);
  assert.ok(match, 'Missing function ' + label);
  return match[0];
};
const artFn = extract(/function productArt\(v\)\{[\s\S]*?\n\}/, 'productArt');
assert.equal((artFn.match(/^  \/\/ /gm) || []).length, 10, 'All ten products must have individually art-directed vector illustrations');
assert.ok(artFn.includes('linearGradient') && artFn.includes('radialGradient'), 'Produce artwork must use lightweight dimensional gradients');
assert.ok(artFn.includes('rx="18" ry="3.2"') && artFn.includes('opacity=".28"'), 'Produce art must sit on a soft painted contact shadow');
assert.ok(html.includes('repeating-linear-gradient(3deg') && html.includes('Premium hand-painted 2D finish'), 'Shelves must use the lightweight hand-painted timber finish');
assert.ok(html.includes('@media(pointer:coarse)') && html.includes('.produce-art{filter:none}'), 'Touch devices must avoid decorative produce filters');
const selectionFn = extract(/function renderSelection\(\)\{[\s\S]*?\n\}/, 'renderSelection');
assert.ok(selectionFn.includes('renderShelf(previous,false)') && selectionFn.includes('renderShelf(current,false)'), 'Selection feedback must repaint only the previous and current shelves');
assert.ok(selectionFn.includes('if(previous===-2)') && selectionFn.includes('lastSelectionPaint=current'), 'Full selection repaint is limited to initial state; normal taps use the two-shelf path');
const moveFn = extract(/function renderMove\(from,to\)\{[\s\S]*?\n\}/, 'renderMove');
assert.ok(moveFn.includes('renderShelf(from,true);renderShelf(to,true)'), 'A move must repaint only its source and destination shelves');
assert.ok(html.includes('@media(pointer:coarse){') && html.includes('.shelf:active{transform:none!important'), 'Touch controls must not wait for decorative press animations');
for (const id of ['finishRibbon','finishMoves','finishProducts','finishReward']) assert.ok(html.includes('id="'+id+'"'), 'Level results must show '+id);
assert.ok(html.includes("$('finishMoves').textContent=moves") && html.includes("$('finishReward').textContent=reward"), 'Level results must report the actual moves and earned coin reward');
assert.ok(html.includes('.finish-stats{display:grid;grid-template-columns:repeat(3'), 'Level results must use a compact responsive stats layout');
assert.ok(artFn.includes('stroke-linecap') && artFn.includes('opacity'), 'Produce artwork must include highlight and contour detail');
assert.ok(!artFn.includes('filter="url('), 'Produce artwork must avoid expensive SVG filter stacks');
for (const name of ['Apples','Carrots','Lemons','Grapes','Pastries','Mangoes','Watermelons','Oranges','Coconuts','Pineapples']) {
  assert.ok(artFn.includes(name) || js.includes("n:'" + name + "'"), 'Product artwork/name mapping must include ' + name);
}
assert.ok(artFn.includes('preserveAspectRatio="xMidYMid meet"'), 'Fruit artwork must scale without cropping');
assert.ok(artFn.includes('aria-label'), 'Every fruit illustration must have an accessible name');
assert.ok(html.includes('@media (pointer:coarse)'), 'Touch-device layout profile must exist');
assert.ok(html.includes('grid-template-rows:repeat(var(--shelf-count,11),minmax(42px,1fr))'), 'Android shelves must use responsive non-overlapping rows');
assert.ok(html.includes('min-height:42px!important'), 'Android shelf touch targets must remain usable');
assert.ok(html.includes('grid-template-rows:repeat(var(--shelf-count,11),minmax(0,1fr))'), 'Short Android screens must fit every shelf without scrolling');
assert.ok(html.includes('overflow:hidden!important'), 'Short Android puzzle board must not clip by internal scrolling');


const seedFn = extract(/function seededRandom\(seed\)\{[^\n]*\}/, 'seededRandom');
const typeFn = extract(/function typesForLevel\(\)\{[^\n]*\}/, 'typesForLevel');
const scrambleFn = extract(/function scramble\(\)\{[\s\S]*?\n\}/, 'scramble');
const nl = String.fromCharCode(10);
const trackedScrambleFn = scrambleFn
  .replace('function scramble(){', 'function scramble(){')
  
  .replace('return b;', 'return {board:b,reverseMoves};');
const generate = new Function('level', 'dailyMode', 'dailySeed', 'scrambleVariant', 'CAP', 'cloneBoard',
  seedFn + nl + typeFn + nl + trackedScrambleFn + nl + 'return scramble();');
const cloneBoard = board => board.map(stack => stack.slice());
let tested = 0;
for (let level = 1; level <= 100; level++) {
  const seen = new Set();
  const typeCount = Math.min(10, 3 + Math.floor((level - 1) / 4));
  for (let variation = 0; variation < 3; variation++) {
    const generated = generate(level, false, '', variation, 4, cloneBoard);
    const board = generated.board;
    const flat = board.flat();
    assert.equal(board.length, typeCount + 1, 'Shelf count at level ' + level);
    assert.ok(board.every(stack => stack.length <= 4), 'Shelf capacity at level ' + level);
    assert.equal(board[typeCount].length, 0, 'The dedicated spare shelf must start empty at level ' + level);
    const hasLegalMove = board.some((stack, from) => stack.length > 0 && board.some((target, to) => to !== from && target.length < 4 && (target.length === 0 || target[target.length - 1] === stack[stack.length - 1])));
    assert.ok(hasLegalMove, 'Every generated puzzle must have a legal opening move at level ' + level);
    assert.equal(flat.length, typeCount * 4, 'Item count at level ' + level);
    for (let item = 0; item < typeCount; item++) {
      assert.equal(flat.filter(value => value === item).length, 4, 'Four copies of product ' + item + ' at level ' + level);
    }
    assert.ok(!board.slice(0, typeCount).every(stack => stack.length === 4 && stack.every(value => value === stack[0])),
      'Generated board must not already be solved at level ' + level);
    const key = JSON.stringify(board);
    assert.ok(!seen.has(key), 'Seeded layouts should vary across mixes at level ' + level);
    seen.add(key);
    const solved = cloneBoard(board);
    for (const [source, destination] of generated.reverseMoves.slice().reverse()) {
      const from = destination, to = source;
      assert.ok(solved[from].length > 0, 'Solution path source must not be empty');
      const item = solved[from][solved[from].length - 1];
      assert.ok(solved[to].length < 4, 'Solution path destination must have space');
      assert.ok(solved[to].length === 0 || solved[to][solved[to].length - 1] === item, 'Solution path must obey matching rules');
      solved[from].pop(); solved[to].push(item);
    }
    assert.ok(solved.slice(0, typeCount).every((stack, index) => stack.length === 4 && stack.every(value => value === stack[0])), 'Every generated puzzle must have a legal solution at level ' + level);
    assert.equal(solved[typeCount].length, 0, 'The spare shelf must be empty after solving');
    tested++;
  }
}
console.log('PASS: syntax, HTML selectors, unique IDs, PWA assets, reward isolation, and ' + tested + ' puzzle layouts across levels 1–100.');

// Swipe responsiveness regression checks
const swipeBlock = html.slice(html.indexOf('let pointerShelf=-1'),html.indexOf("shelfRoot.addEventListener('click'"));
assert.ok(swipeBlock.includes('>9)pointerDragged=true'), 'Swipe threshold must remain low for quick drags');
assert.ok(swipeBlock.includes('setDragHover(dest>=0'), 'Dragging must show a live legal destination');
assert.ok(swipeBlock.includes('if(dragged&&from!==dest&&legalMove(from,dest)){moveShelf(from,dest);return}'), 'One swipe must move an item directly without a second tap');
assert.ok(html.includes('Keep ordinary shelf taps silent') && !html.includes("say('Picked up '+PRODUCTS[stacks[i][stacks[i].length-1]].n)"), 'Ordinary shelf taps must not wait on speech synthesis');

assert.ok(swipeBlock.includes('>9)pointerDragged=true'),'Swipe threshold must be low');
assert.ok(swipeBlock.includes('setDragHover(dest>=0'),'Dragging must show a live legal destination');
assert.ok(swipeBlock.includes('if(dragged&&from!==dest&&legalMove(from,dest)){moveShelf(from,dest);return}'),'One swipe must move directly');
assert.ok(html.includes('Keep ordinary shelf taps silent'),'Ordinary shelf taps must not invoke speech synthesis');
