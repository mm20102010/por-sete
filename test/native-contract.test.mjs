import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');

test('WebApp e Capacitor compartilham public', () => {
  assert.equal(JSON.parse(read('capacitor.config.json')).webDir, 'native-web');
  assert.match(read('public/platform.js'), /capacitor:/);
  assert.match(read('public/app.js'), /!isNativeApp\(\).*serviceWorker/);
});

test('Watch tem home, engrenagem, teclado e complication', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  for (const x of ['gearshape', 'startGame', 'decimalKey', 'submitAnswer']) {
    assert.ok(c.includes(x));
  }
  const w = read('ios/App/Por Sete Watch Complications/PorSeteComplications.swift');
  assert.ok(w.includes('PorSeteAppIcon'));
});

test('Watch mantém jogo glanceable e engrenagem central', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /\.frame\(maxWidth: \.infinity, alignment: \.center\)/);
  assert.match(c, /let rawKeyHeight = \(height - reserved\) \/ 4/);
  assert.match(c, /Text\("✓\\\(game\.correctInPhase\)\/10"\)/);
  assert.match(c, /Text\("✕\\\(game\.errors\)\/3"\)/);
  assert.match(c, /\.frame\(width: unit \* 0\.68\)/);
  assert.match(c, /KeyButton\(height: keyHeight, fontSize: keyFont, accent: true\)/);
});
