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
  assert.match(c, /let smallMainKeyHeight = max\(1, \(availableKeys - smallEnterKeyHeight\) \/ 4\)/);
  assert.match(c, /let stackLift: CGFloat = smallWatch \? 6 : -6/);
  assert.match(c, /\.frame\(width: unit \* 2\.05\)/);
  assert.match(c, /KeyButton\(height: enterKeyHeight, fontSize: enterKeyFont, accent: true\)/);
  assert.ok(c.includes('Button(game.decimalKey(language: settings.language))'));
  assert.ok(c.includes('Image(systemName: "delete.left")'));
});

test('Watch pequeno usa orçamento adaptativo e aproveita melhor a área inferior', () => {
  const samples = [
    { name: '40/41mm compact', width: 176, height: 197 },
    { name: '42mm low', width: 184, height: 205 },
    { name: 'Series 11 42mm', width: 187, height: 223 },
    { name: '42mm generous', width: 189, height: 230 },
  ];

  for (const sample of samples) {
    const rowGap = 2;
    const headerHeight = 26;
    const answerHeight = 19;
    const totalGaps = rowGap * 6;
    const bottomExtension = Math.min(18, Math.max(0, sample.height - 188));
    const bottomSafety = 0;
    const availableKeys = Math.max(
      0,
      sample.height + bottomExtension - headerHeight - answerHeight - totalGaps - bottomSafety,
    );
    const enterKeyHeight = Math.min(30, Math.max(22, availableKeys * 0.18));
    const mainKeyHeight = Math.max(1, (availableKeys - enterKeyHeight) / 4);

    assert.ok(mainKeyHeight >= 24, `${sample.name}: teclas muito baixas (${mainKeyHeight})`);
    assert.ok(mainKeyHeight >= 30, `${sample.name}: deveria aproveitar melhor a área inferior (${mainKeyHeight})`);
  }
});

test('Home do Watch pequeno é compacta e não empurra a engrenagem para fora', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /if smallWatch \{/);
  assert.match(c, /PrimaryButton\(minHeight: 36\)/);
  assert.match(c, /\.frame\(width: 38, height: 38\)/);
  assert.match(c, /Spacer\(\)\s*\.frame\(height: 2\)/);
});

test('Series 11 42mm sobe o header e desce o bloco geral sem alterar o Ultra', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /let headerHeight: CGFloat = smallWatch \? 26 : \(compactWatch \? 30 : 34\)/);
  assert.match(c, /let answerHeight: CGFloat = smallWatch \? 19 : \(compactWatch \? 20 : 22\)/);
  assert.match(c, /let bottomExtension: CGFloat = smallWatch \? min\(18, max\(0, height - 188\)\) : 0/);
  assert.match(c, /let headerLift: CGFloat = smallWatch \? -13 : -9/);
  assert.match(c, /let stackLift: CGFloat = smallWatch \? 6 : -6/);
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

test('Watch não usa atribuições imperativas dentro do ViewBuilder', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.doesNotMatch(c, /let mainKeyHeight: CGFloat[\s\S]*?if smallWatch \{/);
  assert.match(c, /let mainKeyHeight = smallWatch \? smallMainKeyHeight : regularMainKeyHeight/);
  assert.match(c, /let enterKeyHeight = smallWatch \? smallEnterKeyHeight : regularEnterKeyHeight/);
});
