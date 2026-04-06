<template>
  <div id="game-container">
    <div v-if="loading" id="loading">Loading puzzle data...</div>

    <template v-else>
      <header>
        <h1>Reword</h1>
        <button class="header-icon" @click="showHowToPlay = true" aria-label="How to play">?</button>
        <button id="mute-btn" role="switch" :aria-checked="String(!muted)" :aria-label="'Sound'" @click="toggleMute">
          {{ muted ? '\u{1F507}' : '\u{1F50A}' }}
        </button>
      </header>

      <HowToPlay v-if="showHowToPlay" @close="showHowToPlay = false" />

      <template v-if="!gameComplete">
        <GameBoard
          :round="currentRound"
          :round-number="state.currentRound + 1"
          :input-letters="state.inputLetters"
          :message="message"
          :message-type="messageType"
          @submit="handleSubmit"
          @skip="handleSkip"
        >
          <template #timer>
            <span id="letter-score">Letters: {{ runningLetterScore }}</span>
            <span class="timer-display">{{ timerDisplay }}</span>
          </template>
        </GameBoard>

        <VirtualKeyboard @key-press="handleKeyInput" />
      </template>

      <ScoreScreen
        v-if="gameComplete"
        :results="state.completedRounds"
        :date-str="dateStr"
        :total-time-ms="totalTimeMs"
        :share-button-text="shareButtonText"
        :streak-stats="streakStats"
        @share="handleShare"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { selectDailyPuzzle, isValidAnswer, calculateScore, getAnswersForRound, generateShareText, getSubmitFeedbackType, updateStreakStats, processKeyPress, ROUND_TIME_LIMIT_MS, formatRoundTimer } from '../game.js';
import { getAudioContext, initSound } from '../sound.js';
import GameBoard from './GameBoard.vue';
import VirtualKeyboard from './VirtualKeyboard.vue';
import ScoreScreen from './ScoreScreen.vue';
import HowToPlay from './HowToPlay.vue';

const loading = ref(true);
const puzzle = ref(null);
const dateStr = ref('');
const showHowToPlay = ref(false);
const message = ref('');
const messageType = ref('');
const gameComplete = ref(false);
const totalTimeMs = ref(0);
const muted = ref(false);

const state = reactive({
  currentRound: 0,
  completedRounds: [],
  inputLetters: [],
  roundStartTime: null,
  transitioning: false,
});

let timerInterval = null;
const timerDisplay = ref(formatRoundTimer(ROUND_TIME_LIMIT_MS));

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

let audio = null;

function ensureAudio() {
  if (audio) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  audio = initSound(ctx);
  const savedMute = localStorage.getItem('reword-sound-muted') || localStorage.getItem('anagram-trainer-sound-muted');
  if (savedMute === '1') {
    audio.setMuted(true);
    muted.value = true;
  }
}

function playSound(name) {
  if (!audio) return;
  audio.sounds[name]();
}

function toggleMute() {
  ensureAudio();
  if (!audio) return;
  audio.setMuted(!audio.isMuted());
  muted.value = audio.isMuted();
  try { localStorage.setItem('reword-sound-muted', muted.value ? '1' : '0'); } catch (e) {}
}

const currentRound = computed(() => puzzle.value ? puzzle.value[state.currentRound] : null);
const runningLetterScore = computed(() => state.completedRounds.reduce((sum, r) => sum + r.answer.length, 0));
const streakStats = ref(null);

function startTimer() {
  state.roundStartTime = Date.now();
  stopTimer();
  timerDisplay.value = formatRoundTimer(ROUND_TIME_LIMIT_MS);
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - state.roundStartTime;
    const remaining = Math.max(0, ROUND_TIME_LIMIT_MS - elapsed);
    timerDisplay.value = formatRoundTimer(remaining);
    if (remaining <= 0) {
      stopTimer();
      handleSkip();
    }
  }, 100);
}

function handleSubmit() {
  ensureAudio();
  if (state.transitioning || state.currentRound >= 11) return;
  const round = puzzle.value[state.currentRound];
  const answer = state.inputLetters.join('');
  const feedback = getSubmitFeedbackType(answer, round);

  if (feedback === 'invalid-length') {
    const minLen = round.root.length + 1;
    const maxLen = round.root.length + round.offeredLetters.length;
    message.value = `Word must be ${minLen}-${maxLen} letters`;
    messageType.value = 'error';
    playSound('playWrong');
    return;
  }

  if (feedback === 'wrong') {
    message.value = 'Not a valid answer. Try again!';
    messageType.value = 'error';
    playSound('playWrong');
    return;
  }

  stopTimer();
  const timeMs = Math.min(Date.now() - state.roundStartTime, ROUND_TIME_LIMIT_MS);
  const possibleAnswers = getAnswersForRound(round);
  state.completedRounds.push({ answer, timeMs, root: round.root, possibleAnswers });
  message.value = 'Correct!';
  messageType.value = 'success';
  playSound('playCorrect');
  state.transitioning = true;
  setTimeout(() => advanceRound(), 700);
}

function handleSkip() {
  ensureAudio();
  if (state.transitioning || state.currentRound >= 11) return;
  stopTimer();
  const round = puzzle.value[state.currentRound];
  const timeMs = Math.min(Date.now() - state.roundStartTime, ROUND_TIME_LIMIT_MS);
  const possibleAnswers = getAnswersForRound(round);
  state.completedRounds.push({ answer: '', timeMs, root: round.root, possibleAnswers });
  playSound('playSkip');
  if (possibleAnswers.length > 0) {
    message.value = `Possible: ${possibleAnswers.slice(0, 3).join(', ')}`;
    messageType.value = '';
    state.transitioning = true;
    setTimeout(() => advanceRound(), 1200);
  } else {
    message.value = 'Skipped';
    messageType.value = '';
    state.transitioning = true;
    advanceRound();
  }
}

function advanceRound() {
  state.currentRound++;
  if (state.currentRound >= 11) {
    showScore();
    return;
  }
  state.inputLetters = [];
  message.value = '';
  messageType.value = '';
  state.transitioning = false;
  startTimer();
}

function showScore(savedResults) {
  stopTimer();
  gameComplete.value = true;

  const results = savedResults || state.completedRounds;
  totalTimeMs.value = results.reduce((sum, r) => sum + r.timeMs, 0);
  if (!savedResults) {
    playSound('playGameComplete');
  }

  if (!savedResults && dateStr.value) {
    try {
      localStorage.setItem('reword-' + dateStr.value, JSON.stringify({
        results: state.completedRounds,
        totalTimeMs: totalTimeMs.value,
      }));
    } catch (e) {}

    try {
      const rawStats = localStorage.getItem('reword-stats') || localStorage.getItem('anagram-trainer-stats');
      const existingStats = rawStats ? JSON.parse(rawStats) : null;
      const updatedStats = updateStreakStats(existingStats, dateStr.value);
      localStorage.setItem('reword-stats', JSON.stringify(updatedStats));
    } catch (e) {}
  }

  // Load streak stats for display
  try {
    const rawStats = localStorage.getItem('reword-stats') || localStorage.getItem('anagram-trainer-stats');
    if (rawStats) streakStats.value = JSON.parse(rawStats);
  } catch (e) {}
}

function handleKeyInput(key) {
  ensureAudio();
  if (state.currentRound >= 11) return;
  if (key === 'Enter') {
    handleSubmit();
    return;
  }
  const round = puzzle.value[state.currentRound];
  const maxLen = round.root.length + round.offeredLetters.length;
  const prevLen = state.inputLetters.length;
  state.inputLetters = processKeyPress(state.inputLetters, key, maxLen);
  if (state.inputLetters.length !== prevLen) playSound('playKeyClick');
  message.value = '';
  messageType.value = '';
}

const shareButtonText = ref('Share Results');

async function handleShare() {
  const results = state.completedRounds;
  const shareText = generateShareText(results, dateStr.value, totalTimeMs.value);
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    } else {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.focus({ preventScroll: true });
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    shareButtonText.value = 'Copied!';
  } catch (e) {
    shareButtonText.value = 'Could not copy';
  }
  setTimeout(() => { shareButtonText.value = 'Share Results'; }, 2000);
}

let keydownHandler = null;

onMounted(async () => {
  // Physical keyboard support
  keydownHandler = (e) => {
    if (gameComplete.value || loading.value || showHowToPlay.value) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleKeyInput('Backspace');
    } else if (e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
      handleKeyInput(e.key.toLowerCase());
    }
  };
  document.addEventListener('keydown', keydownHandler);

  // Check first visit
  try {
    if (!localStorage.getItem('reword-seen-how-to-play')) {
      showHowToPlay.value = true;
      localStorage.setItem('reword-seen-how-to-play', '1');
    }
  } catch (e) {}

  // Load mute state
  try {
    const savedMuteState = localStorage.getItem('reword-sound-muted') || localStorage.getItem('anagram-trainer-sound-muted');
    if (savedMuteState === '1') muted.value = true;
  } catch (e) {}

  // Load puzzle
  const response = await fetch('/data/puzzles.json');
  const puzzleData = await response.json();

  const today = new Date();
  dateStr.value = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

  puzzle.value = selectDailyPuzzle(puzzleData, dateStr.value);
  loading.value = false;

  // Check for saved game
  try {
    const saved = localStorage.getItem('reword-' + dateStr.value) || localStorage.getItem('anagram-trainer-' + dateStr.value);
    if (saved) {
      const { results } = JSON.parse(saved);
      state.completedRounds = results;
      state.currentRound = 11;
      showScore(results);
      return;
    }
  } catch (e) {}

  startTimer();
});

onUnmounted(() => {
  stopTimer();
  if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
});
</script>
