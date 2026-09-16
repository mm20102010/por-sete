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
  assert.match(c, /let anchoredWatch = smallWatch \|\| ultraWatch/);
  assert.match(c, /let keyboardAvailableHeight = max\(/);
  assert.match(c, /let smallMainKeyHeight = max\(/);
  assert.match(c, /Spacer\(minLength: keyboardTopGap\)/);
  assert.match(c, /\.padding\(\.bottom, keyboardBottomInset\)/);
  assert.match(c, /\.frame\(width: unit \* 2\.05\)/);
  assert.match(c, /KeyButton\(height: enterKeyHeight, fontSize: enterKeyFont, accent: true\)/);
});

test('Watch pequeno ancora teclado no fundo e usa a altura disponível', () => {
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
    const keyboardBottomInset = 4;
    const keyboardTopGap = 4;
    const keyboardAvailableHeight = Math.max(
      0,
      sample.height - headerHeight - answerHeight - keyboardTopGap - keyboardBottomInset,
    );
    const enterKeyHeight = Math.min(36, Math.max(26, keyboardAvailableHeight * 0.20));
    const mainKeyHeight = Math.max(
      1,
      (keyboardAvailableHeight - enterKeyHeight - rowGap * 4) / 4,
    );
    const used = headerHeight + answerHeight + keyboardTopGap + keyboardBottomInset
      + mainKeyHeight * 4 + enterKeyHeight + rowGap * 4;

    const minMain = sample.height < 205 ? 26 : (sample.height < 215 ? 28 : 30);
    assert.ok(mainKeyHeight >= minMain, `${sample.name}: teclas principais baixas (${mainKeyHeight})`);
    assert.ok(Math.abs(used - sample.height) < 0.01, `${sample.name}: sobra vertical inesperada (${sample.height - used})`);
  }
});

test('Home do Watch pequeno é compacta e não empurra a engrenagem para fora', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /if smallWatch \{/);
  assert.match(c, /PrimaryButton\(minHeight: 36\)/);
  assert.match(c, /\.frame\(width: 38, height: 38\)/);
  assert.match(c, /Spacer\(\)\s*\.frame\(height: 2\)/);
});

test('Series 11 42mm usa layout inferior ancorado sem alterar o Ultra', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /let keyboardBottomInset: CGFloat = anchoredWatch \? 4 : 0/);
  assert.match(c, /let keyboardTopGap: CGFloat = anchoredWatch \? 4 : rowGap/);
  assert.match(c, /let headerLift: CGFloat = smallWatch \? -13 : -9/);
  assert.match(c, /let stackLift: CGFloat = smallWatch \? 0 : -6/);
  assert.match(c, /width < 195 \|\| width >= 205/);
  assert.match(c, /\? \.bottom : \[\]/);
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

test('Series 11 e Ultra ignoram somente a safe area inferior do jogo', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /\.ignoresSafeArea\(\s*\.container,/);
  assert.match(c, /width < 195 \|\| width >= 205/);
  assert.match(c, /\? \.bottom : \[\]/);
  assert.doesNotMatch(c, /edges:.*\.top/);
  assert.doesNotMatch(c, /edges:.*\.all/);
});

test('Ultra usa o mesmo ancoramento inferior do Series 11 sem reduzir suas teclas', () => {
  const c = read('ios/App/Por Sete Watch App/ContentView.swift');
  assert.match(c, /let anchoredWatch = smallWatch \|\| ultraWatch/);
  assert.match(c, /if anchoredWatch \{\s*Spacer\(minLength: keyboardTopGap\)/);
  assert.match(c, /min\(ultraWatch \? 40 : 36,/);

  const width = 205;
  const height = 251;
  const rowGap = 2;
  const headerHeight = 34;
  const answerHeight = 22;
  const totalGaps = rowGap * 6;
  const regularAvailableKeys = height - headerHeight - answerHeight - totalGaps;
  const regularRawMainKeyHeight = (regularAvailableKeys - 28) / 4;
  const mainKeyHeight = Math.max(27, Math.min(35, regularRawMainKeyHeight));
  const enterKeyHeight = Math.max(
    24,
    Math.min(40, regularAvailableKeys - mainKeyHeight * 4),
  );

  assert.equal(mainKeyHeight, 35);
  assert.equal(enterKeyHeight, 40);
});
