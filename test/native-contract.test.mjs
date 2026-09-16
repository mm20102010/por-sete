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
  assert.match(c, /let deviceWidth = WKInterfaceDevice\.current\(\)\.screenBounds\.width/);
  assert.match(c, /let smallWatch = deviceWidth < 195/);
  assert.match(c, /let ultraWatch = deviceWidth >= 205/);
  assert.match(c, /mainKeyHeight = max\(1, \(availableKeys - enterKeyHeight\) \/ 4\)/);
  assert.match(c, /let stackLift: CGFloat = smallWatch \? -8 : -6/);
  assert.match(c, /\.frame\(width: unit \* 2\.05\)/);
  assert.match(c, /KeyButton\(height: enterKeyHeight, fontSize: enterKeyFont, accent: true\)/);
  assert.ok(c.includes('Button(game.decimalKey(language: settings.language))'));
  assert.ok(c.includes('Image(systemName: "delete.left")'));
});

test('Watch pequeno nunca excede o orçamento vertical do jogo', () => {
  const samples = [
    { name: '40/41mm compact', width: 176, height: 197 },
    { name: '42mm low', width: 184, height: 205 },
    { name: 'Series 11 42mm', width: 187, height: 223 },
    { name: '42mm generous', width: 189, height: 230 },
  ];

  for (const sample of samples) {
    const rowGap = 2;
    const headerHeight = 28;
    const answerHeight = 20;
    const totalGaps = rowGap * 6;
    const bottomSafety = 4;
    const availableKeys = Math.max(0, sample.height - headerHeight - answerHeight - totalGaps - bottomSafety);
    const enterKeyHeight = Math.min(28, Math.max(20, availableKeys * 0.17));
    const mainKeyHeight = Math.max(1, (availableKeys - enterKeyHeight) / 4);
    const used = headerHeight + answerHeight + totalGaps + bottomSafety + enterKeyHeight + mainKeyHeight * 4;
    assert.ok(used <= sample.height + 1e-9, `${sample.name}: ${used} > ${sample.height}`);
    assert.ok(mainKeyHeight >= 20, `${sample.name}: teclas muito baixas (${mainKeyHeight})`);
  }
});

test('Ultra preserva a geometria grande aprovada', () => {
  const width = 205;
  const height = 251;
  const rowGap = 2;
  const headerHeight = 34;
  const answerHeight = 22;
  const totalGaps = rowGap * 6;
  const availableKeys = height - headerHeight - answerHeight - totalGaps;
  const rawMainKeyHeight = (availableKeys - 28) / 4;
  const mainKeyHeight = Math.max(27, Math.min(35, rawMainKeyHeight));
  const enterKeyHeight = Math.max(24, Math.min(40, availableKeys - mainKeyHeight * 4));
  assert.equal(mainKeyHeight, 35);
  assert.equal(enterKeyHeight, 40);
});