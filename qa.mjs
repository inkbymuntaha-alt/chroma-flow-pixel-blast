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
assert.ok(manifest.icons.some(icon => icon.src === './icon.svg'));
for (const asset of ['./index.html', './manifest.webmanifest', './icon.svg']) {
  assert.ok(sw.includes(asset), 'Service worker must precache ' + asset);
}
assert.ok(sw.includes('self.skipWaiting()'));
assert.ok(sw.includes('self.clients.claim()'));
assert.ok(js.includes("if(!dailyMode&&!worldBonusPaid)"), 'Daily mode must not consume normal chapter rewards');
assert.ok(js.includes("'nbsWorldPerkClaims'"), 'Chapter reward claims must be persisted');
assert.ok(js.includes('Math.min(10,3+Math.floor((level-1)/4))'), 'Progression must support ten product types');
const artFn = extract(/function productArt\\(v\\)\\{[\\s\\S]*?\\n\\}/, 'productArt');
assert.equal((artFn.match(/\\n svg\\('/g) || []).length, 10, 'All ten products must have original vector artwork');
for (const name of ['Apples','Carrots','Lemons','Grapes','Pastries','Mangoes','Watermelons','Oranges','Coconuts','Pineapples']) {
  assert.ok(artFn.includes(name) || js.includes("n:'" + name + "'"), 'Product artwork/name mapping must include ' + name);
}
assert.ok(artFn.includes('preserveAspectRatio="xMidYMid meet"'), 'Fruit artwork must scale without cropping');
assert.ok(artFn.includes('aria-label'), 'Every fruit illustration must have an accessible name');
assert.ok(html.includes('@media (pointer:coarse)'), 'Touch-device layout profile must exist');
assert.ok(html.includes('grid-template-rows:repeat(var(--shelf-count,11),minmax(42px,1fr))'), 'Android shelves must use responsive non-overlapping rows');
assert.ok(html.includes('min-height:42px!important'), 'Android shelf touch targets must remain usable');

const extract = (pattern, label) => {
  const match = js.match(pattern);
  assert.ok(match, 'Missing function ' + label);
  return match[0];
};
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
