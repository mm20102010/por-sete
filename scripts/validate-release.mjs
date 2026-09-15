import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = r => fs.existsSync(path.join(root, r));
const read = r => fs.readFileSync(path.join(root, r), 'utf8');
const errors = [];

const required = [
  'package.json',
  'capacitor.config.json',
  'public/index.html',
  'public/app.js',
  'public/game-core.js',
  'public/i18n.js',
  'public/platform.js',
  'public/privacy.html',
  'public/support.html',
  'ios/App/App.xcodeproj/project.pbxproj',
  'ios/App/App/Info.plist',
  'ios/App/App/PrivacyInfo.xcprivacy',
  'ios/App/Por Sete Watch App/ContentView.swift',
  'ios/App/Por Sete Watch App/GameEngine.swift',
  'ios/App/Por Sete Watch App/WatchGameMath.swift',
  'ios/App/Por Sete Watch App/WatchModels.swift',
  'ios/App/Por Sete Watch App/WatchSettings.swift',
  'ios/App/Por Sete Watch Complications/PorSeteComplications.swift',
  'ios/App/Por Sete Watch Complications/Localizable.xcstrings',
  'ios/App/Por Sete Watch Complications/PrivacyInfo.xcprivacy'
];

for (const r of required) {
  if (!exists(r)) errors.push(`ausente: ${r}`);
}

if (!errors.length) {
  const cfg = JSON.parse(read('capacitor.config.json'));
  if (cfg.appId !== 'br.com.mmregistro.porsete') errors.push('appId inesperado');
  if (cfg.webDir !== 'native-web') errors.push('webDir deve ser native-web');
  if (cfg.server?.url) errors.push('server.url não permitido');

  const app = read('public/app.js');
  if (!app.includes("!isNativeApp() && 'serviceWorker' in navigator")) {
    errors.push('service worker não está isolado do app nativo');
  }

  const platform = read('public/platform.js');
  if (!platform.includes("win?.location?.protocol === 'capacitor:'")) {
    errors.push('detecção capacitor:// ausente');
  }

  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  for (const token of [
    'br.com.mmregistro.porsete',
    'br.com.mmregistro.porsete.watchkitapp',
    'br.com.mmregistro.porsete.watchkitapp.complications',
    'WATCHOS_DEPLOYMENT_TARGET = 10.0',
    'IPHONEOS_DEPLOYMENT_TARGET = 15.0',
    'MARKETING_VERSION = 1.0.0',
    'CURRENT_PROJECT_VERSION = 1'
  ]) {
    if (!pbx.includes(token)) errors.push(`Xcode sem ${token}`);
  }
  if (pbx.includes('br.com.mmregistro.dentes')) errors.push('bundle id do Dentes permaneceu');

  const watchContent = read('ios/App/Por Sete Watch App/ContentView.swift');
  for (const token of ['gearshape', 'startGame', 'decimalKey', 'submitAnswer']) {
    if (!watchContent.includes(token)) errors.push(`Watch sem ${token}`);
  }

  const watchDir = path.join(root, 'ios/App/Por Sete Watch App');
  for (const name of fs.readdirSync(watchDir).filter(n => n.endsWith('.swift'))) {
    const rel = `ios/App/Por Sete Watch App/${name}`;
    const source = read(rel);
    const requiresCombine = /\bObservableObject\b|@Published\b|\bobjectWillChange\b/.test(source);
    if (requiresCombine && !/^import Combine$/m.test(source)) {
      errors.push(`${rel} usa ObservableObject/@Published/objectWillChange sem import Combine`);
    }
  }

  try {
    const catalog = JSON.parse(read('ios/App/Por Sete Watch Complications/Localizable.xcstrings'));
    if (catalog.version !== '1.0') {
      errors.push('Localizable.xcstrings da complication sem version 1.0');
    }
  } catch (error) {
    errors.push(`Localizable.xcstrings inválido: ${error.message}`);
  }

  const comp = read('ios/App/Por Sete Watch Complications/PorSeteComplications.swift');
  if (!comp.includes('PorSeteAppIcon')) errors.push('complication não usa ícone Por Sete');
}

if (process.argv.includes('--repo')) {
  for (const bad of ['.env', '.DS_Store']) {
    if (exists(bad)) errors.push(`arquivo sensível/resíduo: ${bad}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('repository validation: OK');
