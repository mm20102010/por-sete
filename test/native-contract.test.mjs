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
  assert.match(c, /let rawMainKeyHeight = \(availableKeys - 28\) \/ 4/);
  assert.match(c, /HStack\(alignment: \.top, spacing: 2\)/);
  assert.match(c, /let numberFont: CGFloat = compactWatch \? 42 : \(height < 235 \? 46 : 49\)/);
  assert.match(c, /let answerHeight: CGFloat = compactWatch \? 18 : 20/);
  assert.match(c, /\.frame\(width: unit \* 2\.05\)/);
  assert.match(c, /KeyButton\(height: enterKeyHeight, fontSize: enterKeyFont, accent: true\)/);
  assert.ok(c.includes('Button(game.decimalKey(language: settings.language))'));
  assert.ok(c.includes('Image(systemName: "delete.left")'));
});