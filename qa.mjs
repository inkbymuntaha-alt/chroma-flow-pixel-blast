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

const getFunction = (name) => {
  const start = js.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'Missing function ' + name);
  const end = js.indexOf('\n}', start);
  assert.ok(end > start, 'Could not extract function ' + name);
  return js.slice(start, end + 2);
};
const seedFn = getFunction('seededRandom');
const typeFn = getFunction('typesForLevel');
const scrambleFn = getFunction('scramble');
const generate = new Function('level', 'dailyMode', 'dailySeed', 'scrambleVariant', 'CAP', 'cloneBoard',
  seedFn + '\n' + typeFn + '\n' + scrambleFn + '\nreturn scramble();');
const cloneBoard = board => board.map(stack => stack.slice());
const seen = new Set();
let tested = 0;
for (let level = 1; level <= 100; level++) {
  const typeCount = Math.min(10, 3 + Math.floor((level - 1) / 4));
  for (let variation = 0; variation < 3; variation++) {
    const board = generate(level, false, '', variation, 4, cloneBoard);
    const flat = board.flat();
    assert.equal(board.length, typeCount + 1, 'Shelf count at level ' + level);
    assert.ok(board.every(stack => stack.length <= 4), 'Shelf capacity at level ' + level);
    assert.equal(flat.length, typeCount * 4, 'Item count at level ' + level);
    for (let item = 0; item < typeCount; item++) {
      assert.equal(flat.filter(value => value === item).length, 4, 'Four copies of product ' + item + ' at level ' + level);
    }
    assert.ok(!board.slice(0, typeCount).every(stack => stack.length === 4 && stack.every(value => value === stack[0])),
      'Generated board must not already be solved at level ' + level);
    const key = JSON.stringify(board);
    assert.ok(!seen.has(key), 'Seeded layouts should vary across tested mixes');
    seen.add(key);
    tested++;
  }
}
console.log('PASS: syntax, HTML selectors, unique IDs, PWA assets, reward isolation, and ' + tested + ' puzzle layouts across levels 1–100.');
