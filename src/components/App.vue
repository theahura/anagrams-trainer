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

      <HowToPlay v-if="showHowToPlay" @close="handleCloseHowToPlay" />

      <template v-if="!gameComplete">
        <Transition name="round" mode="out-in" @after-enter="onRoundEntered">
          <GameBoard
            :key="state.currentRound"
            :round="currentRound"
            :round-number="state.currentRound + 1"
            :input-letters="state.inputLetters"
            :message="message"
            :message-type="messageType"
            :animation-class="animationClass"
            @submit="handleSubmit"
            @skip="handleSkip"
          >
            <template #timer>
              <span id="letter-score">Letters: {{ runningLetterScore }}</span>
              <span class="timer-display">{{ timerDisplay }}</span>
            </template>
          </GameBoard>
        </Transition>

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
import { selectDailyPuzzle, isValidAnswer, calculateScore, getAnswersForRound, generateShareText, getSubmitFeedbackType, updateStreakStats, processKeyPress, ROUND_TIME_LIMIT_MS, formatRoundTimer, serializeGameState, deserializeGameState } from '../game.js';
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
const animationClass = ref('');
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

function saveInProgressState() {
  if (!dateStr.value) return;
  try {
    const data = serializeGameState(state.currentRound + 1, state.completedRounds, Date.now());
    localStorage.setItem('reword-' + dateStr.value, JSON.stringify(data));
  } catch (e) {}
}

const currentRound = computed(() => puzzle.value ? puzzle.value[state.currentRound] : null);
const runningLetterScore = computed(() => state.completedRounds.reduce((sum, r) => sum + r.answer.length, 0));
const streakStats = ref(null);

function startTimer(alreadyElapsedMs = 0) {
  stopTimer();
  state.roundStartTime = Date.now() - alreadyElapsedMs;
  timerDisplay.value = formatRoundTimer(Math.max(0, ROUND_TIME_LIMIT_MS - alreadyElapsedMs));
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

function handleCloseHowToPlay() {
  showHowToPlay.value = false;
  if (!gameComplete.value && !timerInterval) {
    startTimer();
  }
}

let animationTimeout = null;

function triggerAnimation(cls, durationMs) {
  clearTimeout(animationTimeout);
  animationClass.value = '';
  requestAnimationFrame(() => {
    animationClass.value = cls;
    animationTimeout = setTimeout(() => { animationClass.value = ''; }, durationMs);
  });
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
    triggerAnimation('shake', 400);
    return;
  }

  if (feedback === 'wrong') {
    message.value = 'Not a valid answer. Try again!';
    messageType.value = 'error';
    playSound('playWrong');
    triggerAnimation('shake', 400);
    return;
  }

  stopTimer();
  const timeMs = Math.min(Date.now() - state.roundStartTime, ROUND_TIME_LIMIT_MS);
  const possibleAnswers = getAnswersForRound(round);
  state.completedRounds.push({ answer, timeMs, root: round.root, possibleAnswers });
  saveInProgressState();
  message.value = 'Correct!';
  messageType.value = 'success';
  playSound('playCorrect');
  const bounceDuration = 600 + 80 * Math.max(0, answer.length - 1);
  triggerAnimation('bounce', bounceDuration);
  state.transitioning = true;
  setTimeout(() => advanceRound(), Math.max(700, bounceDuration));
}

function handleSkip() {
  ensureAudio();
  if (state.transitioning || state.currentRound >= 11) return;
  stopTimer();
  const round = puzzle.value[state.currentRound];
  const timeMs = Math.min(Date.now() - state.roundStartTime, ROUND_TIME_LIMIT_MS);
  const possibleAnswers = getAnswersForRound(round);
  state.completedRounds.push({ answer: '', timeMs, root: round.root, possibleAnswers });
  saveInProgressState();
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
  animationClass.value = '';
}

function onRoundEntered() {
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
        status: 'complete',
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
  let restoredElapsedMs = 0;
  try {
    const saved = localStorage.getItem('reword-' + dateStr.value) || localStorage.getItem('anagram-trainer-' + dateStr.value);
    if (saved) {
      const parsed = JSON.parse(saved);
      const inProgress = deserializeGameState(parsed, Date.now());
      if (inProgress) {
        state.completedRounds = inProgress.completedRounds;
        state.currentRound = inProgress.currentRound;
        if (inProgress.elapsedMs >= ROUND_TIME_LIMIT_MS) {
          // Round expired while away — auto-skip
          const round = puzzle.value[state.currentRound];
          const possibleAnswers = getAnswersForRound(round);
          state.completedRounds.push({ answer: '', timeMs: ROUND_TIME_LIMIT_MS, root: round.root, possibleAnswers });
          state.currentRound++;
          saveInProgressState();
          if (state.currentRound >= 11) {
            showScore();
            return;
          }
        } else {
          restoredElapsedMs = inProgress.elapsedMs;
        }
      } else if (parsed.results) {
        state.completedRounds = parsed.results;
        state.currentRound = 11;
        showScore(parsed.results);
        return;
      }
    }
  } catch (e) {}

  if (!showHowToPlay.value) {
    startTimer(restoredElapsedMs);
  }
});

onUnmounted(() => {
  stopTimer();
  clearTimeout(animationTimeout);
  if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
});
</script>
