import { GAME_RULES, GameEngine, formatAnswer, formatCorrectAnswer } from './game-core.js?v=18';
import { getLaunchContext, isNativeApp, isStandaloneLaunch, shouldOfferInstall } from './platform.js?v=18';
import { SUPPORTED_LANGUAGES, normalizeLanguage, translate } from './i18n.js?v=18';

const STORAGE_KEY = 'porSeteLeaderboardV2';
const LAST_NAME_KEY = 'porSeteLastPlayerName';
const LANGUAGE_KEY = 'porSeteLanguageV1';
const MINIMUM_DECIMALS_KEY = 'porSeteMinimumDecimalsV1';
const TOP_LIMIT = 5;
const INSTALL_HINT_KEY = 'porSeteInstallHintDismissedV1';

const app = document.getElementById('app');
const mistakeModal = document.getElementById('mistakeModal');
const mistakeTitle = document.getElementById('mistakeTitle');
const mistakeNumber = document.getElementById('mistakeNumber');
const mistakeCorrect = document.getElementById('mistakeCorrect');
const mistakeWrong = document.getElementById('mistakeWrong');
const continueButton = document.getElementById('continueButton');
const resumeModal = document.getElementById('resumeModal');
const resumeTitle = document.getElementById('resumeTitle');
const resumeText = document.getElementById('resumeText');
const resumeButton = document.getElementById('resumeButton');
const installModal = document.getElementById('installModal');
const installTitle = document.getElementById('installTitle');
const installSteps = document.getElementById('installSteps');
const installDoneButton = document.getElementById('installDoneButton');
const installCloseButton = document.getElementById('installCloseButton');

const engine = new GameEngine();
let animationFrame = 0;
let activeLeaderboardDifficulty = 'beginner';
let selectedAnswerMode = loadAnswerMode();
let selectedLanguage = loadLanguage();
let selectedMinimumDecimals = loadMinimumDecimals();

function loadAnswerMode() {
  // Truncamento continua sendo o critério inicial padrão ao abrir o app.
  return 'truncate';
}

function saveAnswerMode(mode) {
  if (!GAME_RULES.answerModes[mode]) return;
  selectedAnswerMode = mode;
}


function loadMinimumDecimals() {
  try {
    const saved = Number(localStorage.getItem(MINIMUM_DECIMALS_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved <= 10) return saved;
  } catch (_) {}
  return 5;
}

function saveMinimumDecimals(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) return;
  selectedMinimumDecimals = parsed;
  try { localStorage.setItem(MINIMUM_DECIMALS_KEY, String(parsed)); } catch (_) {}
}

function loadLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES[saved]) return saved;
  } catch (_) {}
  return 'pt-BR';
}

function saveLanguage(language) {
  const normalized = normalizeLanguage(language);
  selectedLanguage = normalized;
  try { localStorage.setItem(LANGUAGE_KEY, normalized); } catch (_) {}
  document.documentElement.lang = SUPPORTED_LANGUAGES[normalized].htmlLang;
  syncStaticTranslations();
}

function t(key, variables = {}) {
  return translate(selectedLanguage, key, variables);
}

function answerModeLabel(mode, short = false) {
  if (mode === 'round') return t(short ? 'answerRoundShort' : 'answerRound');
  if (mode === 'truncate') return t(short ? 'answerTruncateShort' : 'answerTruncate');
  return '';
}

function difficultyLabel(key, short = false) {
  const suffix = short ? 'Short' : '';
  if (key === 'beginner') return t(`difficultyBeginner${suffix}`);
  if (key === 'intermediate') return t(`difficultyIntermediate${suffix}`);
  if (key === 'advanced') return t(`difficultyAdvanced${suffix}`);
  return '';
}

function syncStaticTranslations() {
  document.documentElement.lang = SUPPORTED_LANGUAGES[selectedLanguage].htmlLang;
  resumeTitle.textContent = t('gamePaused');
  resumeText.textContent = t('pauseText');
  resumeButton.textContent = t('continueGame');
  installTitle.textContent = t('addHomeScreen');
  installSteps.innerHTML = `
    <li>${t('installStep1')} <strong>${t('share')}</strong>.</li>
    <li>${t('installStep2')} <strong>${t('addHomeScreen')}</strong>.</li>
    <li>${t('installStep3Prefix')} <strong>${t('openAsWebApp')}</strong>, ${t('installStep3Suffix')} <strong>${t('add')}</strong>.</li>
  `;
  installDoneButton.textContent = t('alreadyAdded');
  installCloseButton.textContent = t('notNow');
  continueButton.textContent = t('continue');
}

function emptyLeaderboard() {
  return { beginner: [], intermediate: [], advanced: [] };
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
  const timeMs = Number(entry.timeMs);
  const answerMode = GAME_RULES.answerModes[entry.answerMode] ? entry.answerMode : null;
  const minimumDecimalPlaces = Number.isInteger(Number(entry.minimumDecimalPlaces)) && Number(entry.minimumDecimalPlaces) >= 0 && Number(entry.minimumDecimalPlaces) <= 10 ? Number(entry.minimumDecimalPlaces) : null;
  if (!name || !Number.isFinite(timeMs) || timeMs < 0) return null;
  return {
    name,
    timeMs,
    answerMode,
    minimumDecimalPlaces,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString()
  };
}

function loadLeaderboards() {
  const fallback = emptyLeaderboard();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    for (const difficulty of Object.keys(fallback)) {
      const source = Array.isArray(parsed[difficulty]) ? parsed[difficulty] : [];
      fallback[difficulty] = source
        .map(sanitizeEntry)
        .filter(Boolean)
        .sort((a, b) => a.timeMs - b.timeMs)
        .slice(0, TOP_LIMIT);
    }
  } catch (_) {}
  return fallback;
}

let leaderboards = loadLeaderboards();

function saveLeaderboards() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboards)); } catch (_) {}
}

function getLeaderboard(difficulty = engine.difficulty) {
  return leaderboards[difficulty] || [];
}

function qualifiesForLeaderboard(difficulty, timeMs) {
  const board = getLeaderboard(difficulty);
  return board.length < TOP_LIMIT || timeMs < board[board.length - 1].timeMs;
}

function addRecord(difficulty, name, timeMs, answerMode, minimumDecimalPlaces = null) {
  const cleanName = String(name).trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!cleanName || !Number.isFinite(timeMs)) return false;
  const board = getLeaderboard(difficulty);
  board.push({
    name: cleanName,
    timeMs,
    answerMode: GAME_RULES.answerModes[answerMode] ? answerMode : null,
    minimumDecimalPlaces: Number.isInteger(minimumDecimalPlaces) && minimumDecimalPlaces >= 0 && minimumDecimalPlaces <= 10 ? minimumDecimalPlaces : null,
    createdAt: new Date().toISOString()
  });
  board.sort((a, b) => a.timeMs - b.timeMs);
  leaderboards[difficulty] = board.slice(0, TOP_LIMIT);
  saveLeaderboards();
  try { localStorage.setItem(LAST_NAME_KEY, cleanName); } catch (_) {}
  return true;
}

function formatSeconds(ms, decimals = 2) {
  return `${(Math.max(0, ms) / 1000).toFixed(decimals)}s`;
}

function screenTemplate(content) {
  return `<section class="screen">${content}</section>`;
}

function installHintDismissed() {
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function shouldShowInstallButton() {
  return shouldOfferInstall({ dismissed: installHintDismissed() });
}

function launchContext() {
  return getLaunchContext();
}

function showInstallModal() {
  syncStaticTranslations();
  installModal.hidden = false;
  installDoneButton.focus();
}

function hideInstallModal() {
  installModal.hidden = true;
}

function renderMenu() {
  stopTicker();
  syncStaticTranslations();
  app.innerHTML = screenTemplate(`
    <h1>Por Sete</h1>
    <p class="subtitle">${t('menuSubtitle')}</p>
    <ul class="rules">
      <li>${t('rulePhases', { phases: GAME_RULES.phases })}</li>
      <li>${t('ruleCorrect', { correct: GAME_RULES.correctPerPhase })}</li>
      <li>${t('ruleErrors', { errors: GAME_RULES.maxErrors })}</li>
      <li>${t('rulePrecision')}</li>
    </ul>
    <button class="button button-success" id="startButton" type="button">${t('startGame')}</button>
    <button class="button button-ghost" id="recordsButton" type="button">${t('records')}</button>
    ${shouldShowInstallButton() ? `
      <div class="install-card" id="installCard">
        <div class="install-card-copy">
          <strong>${t('installCardTitle')}</strong>
          <span>${t('installCardText')}</span>
        </div>
        <button class="button install-button" id="installButton" type="button">${t('addHomeScreen')}</button>
      </div>
    ` : ''}
  `);
  document.getElementById('startButton').addEventListener('click', renderDifficulty);
  document.getElementById('recordsButton').addEventListener('click', () => renderRecords(activeLeaderboardDifficulty));
  document.getElementById('installButton')?.addEventListener('click', showInstallModal);
  delete app.dataset.startupPending;
}

function renderDifficulty() {
  stopTicker();
  syncStaticTranslations();
  app.innerHTML = screenTemplate(`
    <h2>${t('configureGame')}</h2>

    <div class="setting-block language-setting">
      <div class="setting-title">${t('language')}</div>
      <div class="segmented language-tabs" id="languageTabs" role="group" aria-label="${t('language')}">
        ${Object.entries(SUPPORTED_LANGUAGES).map(([key, value]) => `
          <button type="button" data-language="${key}" class="${key === selectedLanguage ? 'active' : ''}" lang="${value.htmlLang}">${value.nativeLabel}</button>
        `).join('')}
      </div>
    </div>

    <div class="setting-block answer-rule-setting" id="answerRuleSetting">
      <div class="setting-title">${t('answerRule')}</div>
      <div class="answer-rule-grid">
        <div class="answer-mode-stack" id="answerModeTabs" role="radiogroup" aria-label="${t('answerRule')}">
          <button type="button" role="radio" aria-label="${answerModeLabel('round')}. ${t('roundHelp')}" aria-checked="${selectedAnswerMode === 'round'}" data-answer-mode="round" class="answer-choice ${selectedAnswerMode === 'round' ? 'active' : ''}" title="${t('roundHelp')}">${answerModeLabel('round')}</button>
          <button type="button" role="radio" aria-label="${answerModeLabel('truncate')}. ${t('truncateHelp')}" aria-checked="${selectedAnswerMode === 'truncate'}" data-answer-mode="truncate" class="answer-choice ${selectedAnswerMode === 'truncate' ? 'active' : ''}" title="${t('truncateHelp')}">${answerModeLabel('truncate')}</button>
        </div>
        <label class="minimum-control" for="minimumDecimalsSelect">
          <span class="minimum-label" aria-hidden="true">
            <span>${t('minimumDecimalsShortTop')}</span>
            <span>${t('minimumDecimalsShortBottom')}</span>
          </span>
          <span class="minimum-select-wrap">
            <select id="minimumDecimalsSelect" aria-label="${t('minimumDecimals')}">
              <option value="0" ${selectedMinimumDecimals === 0 ? 'selected' : ''}>${t('minimumFree')}</option>
              ${Array.from({ length: 10 }, (_, index) => index + 1).map(value => `<option value="${value}" ${selectedMinimumDecimals === value ? 'selected' : ''}>${value}</option>`).join('')}
            </select>
          </span>
        </label>
      </div>
    </div>

    <div class="setting-title difficulty-title">${t('difficulty')}</div>
    <div class="difficulty-grid">
      <button class="difficulty-card beginner" data-difficulty="beginner" type="button">
        <h3>🟢 ${difficultyLabel('beginner')}</h3><p>${t('difficultyBeginnerDescription')}</p>
      </button>
      <button class="difficulty-card intermediate" data-difficulty="intermediate" type="button">
        <h3>🟡 ${difficultyLabel('intermediate')}</h3><p>${t('difficultyIntermediateDescription')}</p>
      </button>
      <button class="difficulty-card advanced" data-difficulty="advanced" type="button">
        <h3>🔴 ${difficultyLabel('advanced')}</h3><p>${t('difficultyAdvancedDescription')}</p>
      </button>
    </div>
    <button class="button button-secondary" id="backButton" type="button">${t('back')}</button>
  `);

  document.getElementById('languageTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (!button) return;
    saveLanguage(button.dataset.language);
    renderDifficulty();
  });

  document.getElementById('answerModeTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-answer-mode]');
    if (!button) return;
    saveAnswerMode(button.dataset.answerMode);
    document.querySelectorAll('[data-answer-mode]').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-checked', String(active));
    });
  });

  document.getElementById('minimumDecimalsSelect').addEventListener('change', event => {
    saveMinimumDecimals(event.target.value);
  });

  app.querySelectorAll('[data-difficulty]').forEach(button => {
    button.addEventListener('click', () => startGame(button.dataset.difficulty, selectedAnswerMode, selectedMinimumDecimals));
  });
  document.getElementById('backButton').addEventListener('click', renderMenu);
}

function startGame(difficulty, answerMode = selectedAnswerMode, minimumDecimalPlaces = selectedMinimumDecimals) {
  activeLeaderboardDifficulty = difficulty;
  saveAnswerMode(answerMode);
  engine.startGame(difficulty, answerMode, minimumDecimalPlaces);
  renderPlaying();
}

const keyFeedbackTimers = new WeakMap();
let answerFeedbackTimer = 0;

function pulseKey(button) {
  const previous = keyFeedbackTimers.get(button);
  if (previous) clearTimeout(previous);
  button.classList.add('key-feedback');
  const timer = setTimeout(() => {
    button.classList.remove('key-feedback');
    keyFeedbackTimers.delete(button);
  }, 110);
  keyFeedbackTimers.set(button, timer);
}

function pulseAnswerDisplay() {
  const display = document.getElementById('answerDisplay');
  if (!display) return;
  if (answerFeedbackTimer) clearTimeout(answerFeedbackTimer);
  display.classList.remove('input-feedback');
  void display.offsetWidth;
  display.classList.add('input-feedback');
  answerFeedbackTimer = setTimeout(() => {
    display.classList.remove('input-feedback');
    answerFeedbackTimer = 0;
  }, 130);
}

function activateGameKey(button) {
  if (!button || engine.screen !== 'playing' || engine.paused) return;
  const previousInput = engine.input;
  engine.appendInput(button.dataset.key);
  pulseKey(button);
  updatePlayingStatic();
  if (engine.input !== previousInput) pulseAnswerDisplay();
}

function bindGameKeyboard(keyboard) {
  if (!keyboard) return;

  if ('PointerEvent' in window) {
    const suppressClickUntil = new WeakMap();
    keyboard.addEventListener('pointerdown', event => {
      const button = event.target.closest('[data-key]');
      if (!button) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      suppressClickUntil.set(button, performance.now() + 2500);
      activateGameKey(button);
    });

    keyboard.addEventListener('click', event => {
      const button = event.target.closest('[data-key]');
      if (!button) return;
      const until = suppressClickUntil.get(button) || 0;
      if (performance.now() <= until) {
        suppressClickUntil.delete(button);
        return;
      }
      suppressClickUntil.delete(button);
      activateGameKey(button);
    });
    return;
  }

  keyboard.addEventListener('click', event => {
    const button = event.target.closest('[data-key]');
    if (!button) return;
    activateGameKey(button);
  });
}

function renderPlaying() {
  app.innerHTML = screenTemplate(`
    <div class="game-header">
      <div class="status-row">
        <div class="status-card"><span class="status-label">${t('phase')}</span><span class="status-value" id="phaseValue"></span></div>
        <div class="status-card"><span class="status-label">${t('correct')}</span><span class="status-value" id="correctValue"></span></div>
        <div class="status-card"><span class="status-label">${t('errors')}</span><span class="status-value" id="wrongValue"></span></div>
      </div>
      <div class="status-row">
        <div class="status-card" id="difficultyCard"><span class="status-label">${t('level')}</span><span class="status-value difficulty-status-value" id="difficultyValue"></span></div>
        <div class="status-card"><span class="status-label">${t('question')}</span><span class="status-value" id="questionTimeValue">—</span></div>
        <div class="status-card"><span class="status-label">${t('total')}</span><span class="status-value" id="elapsedValue">0.00s</span></div>
      </div>
    </div>

    <div class="number-display"><span id="numberValue"></span><small>÷ 7 = ?</small></div>
    <input class="answer-display" id="answerDisplay" type="text" value="" readonly aria-label="${t('answer')}">
    <p class="precision-note" id="precisionNote"></p>

    <div class="keyboard" id="keyboard">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="key" data-key="${n}" type="button">${n}</button>`).join('')}
      <button class="key" data-key="," type="button">,</button>
      <button class="key" data-key="0" type="button">0</button>
      <button class="key" data-key="back" type="button" aria-label="${t('erase')}">⌫</button>
    </div>

    <div class="actions">
      <button class="button button-success" id="submitButton" type="button" disabled>${t('submit')}</button>
      <button class="button button-danger quit-button" id="quitButton" type="button">${t('quit')}</button>
    </div>
  `);

  bindGameKeyboard(document.getElementById('keyboard'));
  document.getElementById('submitButton').addEventListener('click', submitAnswer);
  document.getElementById('quitButton').addEventListener('click', () => {
    engine.quit();
    hideMistakeModal();
    hideResumeModal();
    renderMenu();
  });
  updatePlayingStatic();
  startTicker();
}

function updatePlayingStatic() {
  if (engine.screen !== 'playing') return;
  const phaseValue = document.getElementById('phaseValue');
  if (!phaseValue) return;
  phaseValue.textContent = `${engine.phase}/${GAME_RULES.phases}`;
  document.getElementById('correctValue').textContent = `${engine.correctInPhase}/${GAME_RULES.correctPerPhase}`;
  document.getElementById('wrongValue').textContent = `${engine.wrong}/${GAME_RULES.maxErrors}`;
  const difficultyNode = document.getElementById('difficultyValue');
  difficultyNode.textContent = difficultyLabel(engine.difficulty, true);
  difficultyNode.title = difficultyLabel(engine.difficulty);
  document.getElementById('difficultyCard').setAttribute('aria-label', `${t('level')}: ${difficultyLabel(engine.difficulty)}`);
  document.getElementById('numberValue').textContent = String(engine.number);
  document.getElementById('answerDisplay').value = engine.input;
  const precisionNote = document.getElementById('precisionNote');
  if (precisionNote) {
    precisionNote.textContent = engine.minimumDecimalPlaces === 0
      ? t('precisionNoteFree')
      : t('precisionNoteMinimum', { count: engine.minimumDecimalPlaces });
    precisionNote.classList.remove('precision-pending');
  }
  document.getElementById('submitButton').disabled = engine.paused || !engine.input.trim() || engine.input.endsWith(',') || engine.input.endsWith('.');
}

function updateTimers() {
  if (engine.screen !== 'playing') return;
  const elapsed = document.getElementById('elapsedValue');
  if (!elapsed) return;

  const now = performance.now();
  elapsed.textContent = formatSeconds(engine.getElapsedMs(now));

  const questionNode = document.getElementById('questionTimeValue');
  const leftMs = engine.getTimeLeftMs(now);
  if (leftMs == null) {
    questionNode.textContent = t('free');
    questionNode.classList.remove('time-danger');
  } else {
    questionNode.textContent = `${Math.ceil(leftMs / 1000)}s`;
    questionNode.classList.toggle('time-danger', leftMs <= 3000);
    if (!engine.paused && leftMs <= 0 && engine.checkTimeout(now)) {
      showMistake(engine.pendingMistake);
      updatePlayingStatic();
    }
  }
}

function ticker() {
  updateTimers();
  if (engine.screen === 'playing') animationFrame = requestAnimationFrame(ticker);
}

function startTicker() {
  stopTicker();
  animationFrame = requestAnimationFrame(ticker);
}

function stopTicker() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function submitAnswer() {
  const result = engine.submitAnswer();
  if (result.status === 'wrong' || result.status === 'timeout') {
    showMistake(result.mistake);
    updatePlayingStatic();
    return;
  }
  if (result.status === 'victory') {
    hideMistakeModal();
    renderVictory();
    return;
  }
  updatePlayingStatic();
  updateTimers();
}

function showMistake(mistake) {
  if (!mistake) return;
  const precisionText = mistake.decimalPlaces === 1
    ? t('decimalPlaceOne')
    : t('decimalPlacesMany', { count: mistake.decimalPlaces });
  mistakeTitle.textContent = mistake.type === 'timeout' ? t('timeUp') : t('incorrect');
  mistakeNumber.textContent = `${mistake.number} ÷ 7 = ?`;
  mistakeCorrect.textContent = t('correctDetail', {
    mode: answerModeLabel(mistake.answerMode).toLocaleLowerCase(selectedLanguage),
    precision: precisionText,
    answer: mistake.correctAnswer
  });
  mistakeWrong.textContent = t('yourAnswer', {
    answer: mistake.type === 'timeout' ? t('timeoutAnswer') : mistake.userAnswer
  });
  mistakeModal.hidden = false;
  continueButton.focus();
}

function hideMistakeModal() {
  mistakeModal.hidden = true;
}

continueButton.addEventListener('click', () => {
  hideMistakeModal();
  const result = engine.continueAfterMistake();
  if (result.status === 'gameOver') {
    renderGameOver();
    return;
  }
  updatePlayingStatic();
  updateTimers();
});

function renderGameOver() {
  stopTicker();
  const replayDifficulty = engine.difficulty;
  const replayMode = engine.answerMode;
  const replayMinimumDecimals = engine.minimumDecimalPlaces;
  app.innerHTML = screenTemplate(`
    <h2>${t('gameOver')}</h2>
    <p>${t('gameOverReached', { phase: engine.phase, mode: answerModeLabel(replayMode) })}</p>
    <div class="result-time">${formatSeconds(engine.finalElapsedMs)}</div>
    <p>${t('gameOverStats', { correct: engine.totalCorrect, errors: engine.wrong })}</p>
    <p>${t('gameOverRanking')}</p>
    <button class="button button-success" id="playAgainButton" type="button">${t('playAgain')}</button>
    <button class="button button-secondary" id="menuButton" type="button">${t('menu')}</button>
  `);
  document.getElementById('playAgainButton').addEventListener('click', () => startGame(replayDifficulty, replayMode, replayMinimumDecimals));
  document.getElementById('menuButton').addEventListener('click', () => { engine.reset(); renderMenu(); });
}

function renderVictory() {
  stopTicker();
  const finalTime = engine.finalElapsedMs;
  const finishedMode = engine.answerMode;
  const finishedMinimumDecimals = engine.minimumDecimalPlaces;
  const qualifies = qualifiesForLeaderboard(engine.difficulty, finalTime);
  let lastName = '';
  try { lastName = localStorage.getItem(LAST_NAME_KEY) || ''; } catch (_) {}

  app.innerHTML = screenTemplate(`
    <h2>${t('victory')}</h2>
    <p>${t('victoryText', {
      phases: GAME_RULES.phases,
      difficulty: difficultyLabel(engine.difficulty),
      mode: answerModeLabel(finishedMode)
    })}</p>
    <div class="result-time">${formatSeconds(finalTime)}</div>
    ${qualifies ? `
      <div style="text-align:center"><span class="record-badge">${t('topRecord', { limit: TOP_LIMIT })}</span></div>
      <label for="playerName" style="display:block;text-align:center;color:#cbd5e1;margin-bottom:8px">${t('recordHolderName')}</label>
      <input class="name-input" id="playerName" type="text" maxlength="24" autocomplete="name" enterkeyhint="done" value="${escapeAttribute(lastName)}" placeholder="${escapeAttribute(t('yourName'))}">
      <p class="validation" id="nameValidation"></p>
      <button class="button button-success" id="saveRecordButton" type="button">${t('saveRecord')}</button>
    ` : `<p>${t('noTop', { limit: TOP_LIMIT })}</p>`}
    <button class="button button-primary" id="showRecordsButton" type="button">${t('viewRecords')}</button>
    <button class="button button-secondary" id="menuButton" type="button">${t('menu')}</button>
  `);

  if (qualifies) {
    const input = document.getElementById('playerName');
    const saveButton = document.getElementById('saveRecordButton');
    const save = () => saveRecordFromVictory(input, finalTime, finishedMode, finishedMinimumDecimals);
    saveButton.addEventListener('click', save);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') save(); });
    setTimeout(() => input.focus(), 50);
  }

  document.getElementById('showRecordsButton').addEventListener('click', () => renderRecords(engine.difficulty));
  document.getElementById('menuButton').addEventListener('click', () => { engine.reset(); renderMenu(); });
}

function saveRecordFromVictory(input, finalTime, answerMode, minimumDecimalPlaces) {
  const validation = document.getElementById('nameValidation');
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) {
    validation.textContent = t('nameRequired');
    input.focus();
    return;
  }
  if (!qualifiesForLeaderboard(engine.difficulty, finalTime)) {
    validation.textContent = t('rankingChanged', { limit: TOP_LIMIT });
    return;
  }
  addRecord(engine.difficulty, name, finalTime, answerMode, minimumDecimalPlaces);
  activeLeaderboardDifficulty = engine.difficulty;
  renderRecords(engine.difficulty, t('recordSaved', { name }));
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderRecords(difficulty = 'beginner', message = '') {
  stopTicker();
  activeLeaderboardDifficulty = difficulty;
  app.innerHTML = screenTemplate(`
    <h2>🏆 ${t('records')}</h2>
    <div class="segmented record-tabs" id="recordTabs">
      ${Object.keys(GAME_RULES.difficulties).map(key => `<button type="button" data-record-difficulty="${key}" class="${key === difficulty ? 'active' : ''}" title="${escapeAttribute(difficultyLabel(key))}">${difficultyLabel(key, true)}</button>`).join('')}
    </div>
    ${message ? `<p class="record-badge" style="display:block;text-align:center">${escapeHtml(message)}</p>` : ''}
    <div id="leaderboardContainer"></div>
    <button class="button button-primary" id="playThisLevelButton" type="button">${t('playDifficulty', { difficulty: difficultyLabel(difficulty) })}</button>
    <button class="button button-secondary" id="menuButton" type="button">${t('menu')}</button>
  `);

  renderLeaderboardTable(difficulty);
  document.getElementById('recordTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-record-difficulty]');
    if (!button) return;
    renderRecords(button.dataset.recordDifficulty);
  });
  document.getElementById('playThisLevelButton').addEventListener('click', () => startGame(difficulty, selectedAnswerMode, selectedMinimumDecimals));
  document.getElementById('menuButton').addEventListener('click', () => { engine.reset(); renderMenu(); });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function renderLeaderboardTable(difficulty) {
  const container = document.getElementById('leaderboardContainer');
  const board = getLeaderboard(difficulty);
  container.replaceChildren();

  if (!board.length) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = t('noRecords');
    container.appendChild(p);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'leaderboard-wrap';
  const table = document.createElement('table');
  table.className = 'leaderboard';
  table.innerHTML = `<thead><tr><th>#</th><th>${t('name')}</th><th>${t('time')}</th></tr></thead>`;
  const tbody = document.createElement('tbody');

  board.forEach((entry, index) => {
    const row = document.createElement('tr');
    const rank = document.createElement('td');
    const name = document.createElement('td');
    const time = document.createElement('td');
    rank.textContent = String(index + 1);

    const nameMain = document.createElement('div');
    nameMain.textContent = entry.name;
    name.appendChild(nameMain);
    if (entry.answerMode || entry.minimumDecimalPlaces != null) {
      const meta = document.createElement('div');
      meta.className = 'record-meta';
      const parts = [];
      if (entry.answerMode) parts.push(answerModeLabel(entry.answerMode));
      if (entry.minimumDecimalPlaces != null) {
        parts.push(entry.minimumDecimalPlaces === 0
          ? t('minimumRecordFree')
          : t('minimumRecord', { count: entry.minimumDecimalPlaces }));
      }
      meta.textContent = parts.join(' · ');
      name.appendChild(meta);
    }

    time.textContent = formatSeconds(entry.timeMs);
    row.append(rank, name, time);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
}

function hideResumeModal() {
  resumeModal.hidden = true;
}

resumeButton.addEventListener('click', () => {
  hideResumeModal();
  engine.resume();
  updatePlayingStatic();
  updateTimers();
});

installCloseButton.addEventListener('click', hideInstallModal);

installDoneButton.addEventListener('click', () => {
  try { localStorage.setItem(INSTALL_HINT_KEY, '1'); } catch (_) {}
  hideInstallModal();
  if (engine.screen === 'menu') renderMenu();
});

installModal.addEventListener('click', event => {
  if (event.target === installModal) hideInstallModal();
});

function showResumeIfNeeded() {
  if (engine.screen === 'playing' && engine.paused && engine.pauseReason === 'background' && !engine.pendingMistake) {
    syncStaticTranslations();
    resumeModal.hidden = false;
    resumeButton.focus();
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (engine.screen === 'playing' && !engine.paused && !engine.pendingMistake) {
      engine.pause('background');
    }
    return;
  }
  showResumeIfNeeded();
}

document.addEventListener('visibilitychange', handleVisibilityChange);

window.addEventListener('pagehide', () => {
  if (engine.screen === 'playing' && !engine.paused) engine.pause('background');
});

window.addEventListener('pageshow', () => {
  if (!document.hidden) showResumeIfNeeded();
});

if (!isNativeApp() && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js?v=18', {
        scope: '/',
        updateViaCache: 'none'
      });
      registration.update().catch(() => {});
    } catch (_) {}
  });
}

saveLanguage(selectedLanguage);
renderMenu();

window.PorSete = Object.freeze({
  formatAnswer,
  formatCorrectAnswer,
  get rules() { return GAME_RULES; },
  get language() { return selectedLanguage; },
  get launchContext() { return launchContext(); },
  get standalone() { return isStandaloneLaunch(); }
});
