export const GAME_RULES = Object.freeze({
  phases: 5,
  correctPerPhase: 10,
  maxErrors: 3,
  difficulties: Object.freeze({
    beginner: Object.freeze({ label: 'Iniciante', secondsByPhase: [null, null, null, null, null] }),
    intermediate: Object.freeze({ label: 'Intermediário', secondsByPhase: [20, 18, 16, 14, 12] }),
    advanced: Object.freeze({ label: 'Avançado', secondsByPhase: [5, 4, 3, 2, 1] })
  }),
  answerModes: Object.freeze({
    round: Object.freeze({ label: 'Arredondar', shortLabel: 'Arred.' }),
    truncate: Object.freeze({ label: 'Truncar', shortLabel: 'Trunc.' })
  })
});

function normalizeIntegerPart(value) {
  const cleaned = String(value).replace(/^0+(?=\d)/, '');
  return cleaned || '0';
}

export function parsePlayerAnswer(raw) {
  const normalized = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;

  const dotIndex = normalized.indexOf('.');
  const rawInteger = dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
  const decimals = dotIndex >= 0 ? normalized.slice(dotIndex + 1) : '';
  const integerPart = normalizeIntegerPart(rawInteger);

  return {
    integerPart,
    decimals,
    decimalPlaces: decimals.length,
    canonical: decimals.length ? `${integerPart}.${decimals}` : integerPart
  };
}

function divisionParts(number, decimalPlaces) {
  const safeNumber = Number(number);
  if (!Number.isInteger(safeNumber) || safeNumber < 0) {
    throw new Error('O número deve ser um inteiro não negativo.');
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new Error('A quantidade de casas decimais deve ser um inteiro não negativo.');
  }

  const integerPart = Math.floor(safeNumber / 7);
  let remainder = safeNumber % 7;
  let decimals = '';

  // Usa divisão longa decimal. Assim a validação não depende da precisão binária
  // do Number e continua correta mesmo quando o jogador digita muitas casas.
  for (let i = 0; i < decimalPlaces; i += 1) {
    remainder *= 10;
    decimals += String(Math.floor(remainder / 7));
    remainder %= 7;
  }

  return { integerPart: String(integerPart), decimals, remainder };
}

function incrementDecimalString(integerPart, decimals) {
  const decimalPlaces = decimals.length;
  const chars = `${integerPart}${decimals}`.split('');
  let carry = 1;

  for (let i = chars.length - 1; i >= 0 && carry; i -= 1) {
    const value = Number(chars[i]) + carry;
    chars[i] = String(value % 10);
    carry = value >= 10 ? 1 : 0;
  }
  if (carry) chars.unshift('1');

  const combined = chars.join('');
  if (decimalPlaces === 0) return { integerPart: combined, decimals: '' };

  const split = combined.length - decimalPlaces;
  return {
    integerPart: combined.slice(0, split) || '0',
    decimals: combined.slice(split).padStart(decimalPlaces, '0')
  };
}

export function expectedAnswer(number, decimalPlaces, mode = 'truncate') {
  if (!GAME_RULES.answerModes[mode]) throw new Error(`Critério inválido: ${mode}`);

  const extra = mode === 'round' ? 1 : 0;
  const parts = divisionParts(number, decimalPlaces + extra);

  let integerPart = parts.integerPart;
  let decimals = parts.decimals.slice(0, decimalPlaces);

  if (mode === 'round') {
    const nextDigit = Number(parts.decimals[decimalPlaces] ?? '0');
    if (nextDigit >= 5) {
      ({ integerPart, decimals } = incrementDecimalString(integerPart, decimals));
    }
  }

  return decimalPlaces > 0 ? `${integerPart}.${decimals}` : integerPart;
}

export function formatAnswer(number, decimalPlaces = 5, mode = 'truncate', separator = ',') {
  return expectedAnswer(number, decimalPlaces, mode).replace('.', separator);
}

export function formatCorrectAnswer(number, mode = 'truncate') {
  return formatAnswer(number, 5, mode, ',');
}

function answerComparison(parsed, minimumDecimalPlaces) {
  // Zeros finais são apenas formatação: 27, 27,000 e 27,0000 representam
  // a mesma precisão significativa. Primeiro os removemos; depois completamos
  // implicitamente com zeros até o mínimo configurado.
  const significantDecimals = parsed.decimals.replace(/0+$/, '');
  const decimalPlaces = Math.max(significantDecimals.length, minimumDecimalPlaces);
  const decimals = significantDecimals.padEnd(decimalPlaces, '0');
  return {
    decimalPlaces,
    canonical: decimalPlaces > 0 ? `${parsed.integerPart}.${decimals}` : parsed.integerPart
  };
}

export function isCorrectAnswer(number, raw, mode = 'truncate', minimumDecimalPlaces = 0) {
  const parsed = parsePlayerAnswer(raw);
  if (!parsed) return false;
  if (!Number.isInteger(minimumDecimalPlaces) || minimumDecimalPlaces < 0) return false;
  const comparison = answerComparison(parsed, minimumDecimalPlaces);
  return comparison.canonical === expectedAnswer(number, comparison.decimalPlaces, mode);
}


export class GameEngine {
  constructor({ now = () => performance.now(), random = Math.random } = {}) {
    this.now = now;
    this.random = random;
    this.reset();
  }

  reset() {
    this.screen = 'menu';
    this.difficulty = null;
    this.answerMode = 'truncate';
    this.minimumDecimalPlaces = 5;
    this.phase = 1;
    this.correctInPhase = 0;
    this.totalCorrect = 0;
    this.wrong = 0;
    this.number = 0;
    this.input = '';
    this.paused = true;
    this.pauseReason = null;
    this.elapsedAccumulatedMs = 0;
    this.activeStartedAt = null;
    this.questionRemainingMs = null;
    this.questionDeadlineAt = null;
    this.finalElapsedMs = null;
    this.pendingMistake = null;
  }

  startGame(difficulty, answerMode = 'truncate', minimumDecimalPlaces = 5) {
    if (!GAME_RULES.difficulties[difficulty]) {
      throw new Error(`Dificuldade inválida: ${difficulty}`);
    }
    if (!GAME_RULES.answerModes[answerMode]) {
      throw new Error(`Critério inválido: ${answerMode}`);
    }
    if (!Number.isInteger(minimumDecimalPlaces) || minimumDecimalPlaces < 0 || minimumDecimalPlaces > 10) {
      throw new Error(`Mínimo de casas decimais inválido: ${minimumDecimalPlaces}`);
    }

    this.difficulty = difficulty;
    this.answerMode = answerMode;
    this.minimumDecimalPlaces = minimumDecimalPlaces;
    this.screen = 'playing';
    this.phase = 1;
    this.correctInPhase = 0;
    this.totalCorrect = 0;
    this.wrong = 0;
    this.input = '';
    this.elapsedAccumulatedMs = 0;
    this.finalElapsedMs = null;
    this.pendingMistake = null;
    this.paused = false;
    this.pauseReason = null;

    const now = this.now();
    this.activeStartedAt = now;
    this.nextNumber();
    this.resetQuestionClock(now);
  }

  nextNumber() {
    const previous = this.number;
    let next = Math.floor(this.random() * 1000);
    if (next === previous && previous !== 0) next = (next + 1) % 1000;
    this.number = next;
    this.input = '';
  }

  phaseSeconds() {
    const config = GAME_RULES.difficulties[this.difficulty];
    return config ? config.secondsByPhase[this.phase - 1] : null;
  }

  resetQuestionClock(now = this.now()) {
    const seconds = this.phaseSeconds();
    if (seconds == null) {
      this.questionRemainingMs = null;
      this.questionDeadlineAt = null;
      return;
    }
    this.questionRemainingMs = seconds * 1000;
    this.questionDeadlineAt = this.paused ? null : now + this.questionRemainingMs;
  }

  getElapsedMs(now = this.now()) {
    if (this.finalElapsedMs != null) return this.finalElapsedMs;
    if (!this.paused && this.activeStartedAt != null) {
      return this.elapsedAccumulatedMs + Math.max(0, now - this.activeStartedAt);
    }
    return this.elapsedAccumulatedMs;
  }

  getTimeLeftMs(now = this.now()) {
    if (this.phaseSeconds() == null) return null;
    if (this.paused || this.questionDeadlineAt == null) {
      return Math.max(0, this.questionRemainingMs ?? 0);
    }
    return Math.max(0, this.questionDeadlineAt - now);
  }

  pause(reason = 'manual', now = this.now()) {
    if (this.paused || this.screen !== 'playing') return;

    if (this.activeStartedAt != null) {
      this.elapsedAccumulatedMs += Math.max(0, now - this.activeStartedAt);
    }
    this.activeStartedAt = null;

    if (this.questionDeadlineAt != null) {
      this.questionRemainingMs = Math.max(0, this.questionDeadlineAt - now);
      this.questionDeadlineAt = null;
    }

    this.paused = true;
    this.pauseReason = reason;
  }

  resume(now = this.now()) {
    if (!this.paused || this.screen !== 'playing' || this.pendingMistake) return;
    this.paused = false;
    this.pauseReason = null;
    this.activeStartedAt = now;
    if (this.questionRemainingMs != null) {
      this.questionDeadlineAt = now + this.questionRemainingMs;
    }
  }

  appendInput(key) {
    if (this.screen !== 'playing' || this.paused) return;

    if (key === 'back') {
      this.input = this.input.slice(0, -1);
      return;
    }

    if (key === ',') {
      if (!this.input.includes(',') && !this.input.includes('.')) {
        this.input = this.input ? `${this.input},` : '0,';
      }
      return;
    }

    if (/^\d$/.test(key)) this.input += key;
  }

  checkTimeout(now = this.now()) {
    if (this.screen !== 'playing' || this.paused || this.questionDeadlineAt == null) return false;
    if (now < this.questionDeadlineAt) return false;

    // O timeout ocorreu exatamente no deadline, mesmo que o navegador só
    // consiga executar esta checagem alguns milissegundos depois. Isso evita
    // que atrasos de requestAnimationFrame/event loop entrem no tempo total.
    const timeoutAt = this.questionDeadlineAt;
    this.questionRemainingMs = 0;
    this.pause('mistake', timeoutAt);
    const displayDecimalPlaces = Math.max(5, this.minimumDecimalPlaces);
    this.pendingMistake = {
      type: 'timeout',
      number: this.number,
      userAnswer: null,
      decimalPlaces: displayDecimalPlaces,
      correctAnswer: formatAnswer(this.number, displayDecimalPlaces, this.answerMode, ','),
      answerMode: this.answerMode
    };
    return true;
  }

  submitAnswer(now = this.now()) {
    if (this.screen !== 'playing' || this.paused || !String(this.input).trim()) {
      return { status: 'ignored' };
    }

    if (this.checkTimeout(now)) {
      return { status: 'timeout', mistake: this.pendingMistake };
    }

    const submitted = this.input;
    const number = this.number;
    const parsed = parsePlayerAnswer(submitted);

    if (!parsed || !isCorrectAnswer(number, submitted, this.answerMode, this.minimumDecimalPlaces)) {
      this.pause('mistake', now);
      const decimalPlaces = parsed
        ? answerComparison(parsed, this.minimumDecimalPlaces).decimalPlaces
        : Math.max(5, this.minimumDecimalPlaces);
      this.pendingMistake = {
        type: 'wrong',
        number,
        userAnswer: submitted,
        decimalPlaces,
        correctAnswer: formatAnswer(number, decimalPlaces, this.answerMode, ','),
        answerMode: this.answerMode
      };
      return { status: 'wrong', mistake: this.pendingMistake };
    }

    this.correctInPhase += 1;
    this.totalCorrect += 1;

    if (this.correctInPhase >= GAME_RULES.correctPerPhase) {
      if (this.phase >= GAME_RULES.phases) {
        this.finish('victory', now);
        return { status: 'victory' };
      }
      this.phase += 1;
      this.correctInPhase = 0;
    }

    this.nextNumber();
    this.resetQuestionClock(now);
    return { status: 'correct' };
  }

  continueAfterMistake(now = this.now()) {
    if (!this.pendingMistake || this.screen !== 'playing') {
      return { status: 'ignored' };
    }

    this.wrong += 1;
    this.pendingMistake = null;

    if (this.wrong >= GAME_RULES.maxErrors) {
      this.finish('gameOver', now);
      return { status: 'gameOver' };
    }

    this.nextNumber();
    this.resetQuestionClock(now);
    this.resume(now);
    return { status: 'continue' };
  }

  finish(screen, now = this.now()) {
    if (!this.paused) this.pause('finished', now);
    this.screen = screen;
    this.finalElapsedMs = this.elapsedAccumulatedMs;
    this.paused = true;
    this.pauseReason = 'finished';
    this.questionDeadlineAt = null;
    this.pendingMistake = null;
  }

  quit(now = this.now()) {
    if (this.screen === 'playing' && !this.paused) this.pause('quit', now);
    this.reset();
  }
}
