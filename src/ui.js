import { isValidAnswer, calculateScore } from './game.js';

const SCRABBLE_POINTS = {
  a:1, b:3, c:3, d:2, e:1, f:4, g:2, h:4, i:1, j:8, k:5, l:1, m:3,
  n:1, o:1, p:3, q:10, r:1, s:1, t:1, u:1, v:4, w:4, x:8, y:4, z:10
};

function createTile(letter, opts = {}) {
  const tile = document.createElement('div');
  tile.className = 'tile' + (opts.className ? ' ' + opts.className : '');
  if (letter) {
    tile.textContent = letter.toUpperCase();
    const points = document.createElement('span');
    points.className = 'points';
    points.textContent = SCRABBLE_POINTS[letter.toLowerCase()] || '';
    tile.appendChild(points);
  }
  if (opts.onClick) tile.addEventListener('click', opts.onClick);
  return tile;
}

export function initUI(puzzle) {
  const container = document.getElementById('game-container');
  container.innerHTML = '';

  const state = {
    currentRound: 0,
    completedRounds: [],
    inputLetters: [],
    startTime: null,
    roundStartTime: null,
    timerInterval: null,
  };

  // Header
  const header = document.createElement('header');
  header.innerHTML = '<h1>Anagram Trainer</h1>';
  container.appendChild(header);

  // Game info bar
  const gameInfo = document.createElement('div');
  gameInfo.className = 'game-info';
  gameInfo.innerHTML = `
    <span id="round-indicator">Round 1 of 11</span>
    <span id="timer">0:00</span>
  `;
  container.appendChild(gameInfo);

  // Root word section
  const rootLabel = document.createElement('div');
  rootLabel.className = 'section-label';
  rootLabel.textContent = 'Root Word';
  container.appendChild(rootLabel);

  const rootRack = document.createElement('div');
  rootRack.className = 'tile-rack';
  rootRack.id = 'root-rack';
  container.appendChild(rootRack);

  // Offered letters section
  const offeredLabel = document.createElement('div');
  offeredLabel.className = 'section-label';
  offeredLabel.textContent = 'Add One Letter';
  container.appendChild(offeredLabel);

  const offeredRack = document.createElement('div');
  offeredRack.className = 'tile-rack';
  offeredRack.id = 'offered-rack';
  container.appendChild(offeredRack);

  // Instructions
  const instructions = document.createElement('div');
  instructions.className = 'instructions';
  instructions.textContent = 'Type a new word using all root letters + one offered letter';
  container.appendChild(instructions);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.id = 'input-area';
  container.appendChild(inputArea);

  // Hidden input for keyboard
  const hiddenInput = document.createElement('input');
  hiddenInput.id = 'hidden-input';
  hiddenInput.type = 'text';
  hiddenInput.autocomplete = 'off';
  hiddenInput.autocapitalize = 'off';
  container.appendChild(hiddenInput);

  // Message area
  const message = document.createElement('div');
  message.id = 'message';
  container.appendChild(message);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.id = 'submit-btn';
  submitBtn.textContent = 'Submit';
  container.appendChild(submitBtn);

  // Skip button
  const skipBtn = document.createElement('button');
  skipBtn.id = 'skip-btn';
  skipBtn.textContent = 'Skip';
  container.appendChild(skipBtn);

  // Score screen
  const scoreScreen = document.createElement('div');
  scoreScreen.id = 'score-screen';
  container.appendChild(scoreScreen);

  function renderRound() {
    const round = puzzle[state.currentRound];
    document.getElementById('round-indicator').textContent =
      `Round ${state.currentRound + 1} of 11`;

    // Root tiles
    rootRack.innerHTML = '';
    for (const letter of round.root) {
      rootRack.appendChild(createTile(letter));
    }

    // Offered letter tiles
    offeredRack.innerHTML = '';
    for (const letter of round.offeredLetters) {
      offeredRack.appendChild(createTile(letter, { className: 'offered' }));
    }

    // Clear input
    state.inputLetters = [];
    renderInput();
    setMessage('');

    // Focus hidden input
    hiddenInput.value = '';
    hiddenInput.focus();
  }

  function renderInput() {
    inputArea.innerHTML = '';
    const round = puzzle[state.currentRound];
    const maxLen = round.root.length + 1;

    for (let i = 0; i < maxLen; i++) {
      if (i < state.inputLetters.length) {
        inputArea.appendChild(createTile(state.inputLetters[i]));
      } else {
        inputArea.appendChild(createTile('', { className: 'empty' }));
      }
    }
  }

  function setMessage(text, type = '') {
    message.textContent = text;
    message.className = type ? `${type}` : '';
    message.id = 'message';
  }

  function startTimer() {
    if (!state.startTime) {
      state.startTime = Date.now();
    }
    state.roundStartTime = Date.now();

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      const elapsed = Date.now() - state.startTime;
      const seconds = Math.floor(elapsed / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      document.getElementById('timer').textContent =
        `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 100);
  }

  function handleSubmit() {
    const round = puzzle[state.currentRound];
    const answer = state.inputLetters.join('');

    if (answer.length !== round.root.length + 1) {
      setMessage(`Word must be ${round.root.length + 1} letters`, 'error');
      return;
    }

    if (!isValidAnswer(answer, round)) {
      setMessage('Not a valid answer. Try again!', 'error');
      return;
    }

    const timeMs = Date.now() - state.roundStartTime;
    state.completedRounds.push({ answer, timeMs });
    setMessage('Correct!', 'success');
    advanceRound();
  }

  function handleSkip() {
    const timeMs = Date.now() - state.roundStartTime;
    state.completedRounds.push({ answer: '', timeMs });
    setMessage('Skipped', '');
    advanceRound();
  }

  function advanceRound() {
    state.currentRound++;
    if (state.currentRound >= 11) {
      showScore();
      return;
    }
    setTimeout(() => {
      renderRound();
      startTimer();
    }, 600);
  }

  function showScore() {
    clearInterval(state.timerInterval);
    const totalTimeMs = Date.now() - state.startTime;
    const completed = state.completedRounds.filter(r => r.answer.length > 0);
    const score = calculateScore(completed);

    const mins = Math.floor(totalTimeMs / 1000 / 60);
    const secs = Math.floor(totalTimeMs / 1000) % 60;

    // Hide game elements
    rootRack.parentElement.querySelectorAll('.section-label, .tile-rack, #input-area, #submit-btn, #skip-btn, .instructions')
      .forEach(el => el.style.display = 'none');

    scoreScreen.style.display = 'block';
    scoreScreen.innerHTML = `
      <h2>Game Complete!</h2>
      <div class="stat">Words Solved<br><span class="stat-value">${score.roundsCompleted} / 11</span></div>
      <div class="stat">Total Letters<br><span class="stat-value">${score.totalLetters}</span></div>
      <div class="stat">Total Time<br><span class="stat-value">${mins}:${secs.toString().padStart(2, '0')}</span></div>
    `;
  }

  // Keyboard handling
  hiddenInput.addEventListener('input', (e) => {
    if (!state.startTime) startTimer();
    const round = puzzle[state.currentRound];
    const maxLen = round.root.length + 1;
    const val = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
    state.inputLetters = val.slice(0, maxLen).split('');
    hiddenInput.value = state.inputLetters.join('');
    renderInput();
    setMessage('');
  });

  hiddenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  });

  submitBtn.addEventListener('click', handleSubmit);
  skipBtn.addEventListener('click', handleSkip);

  // Keep focus on hidden input
  container.addEventListener('click', () => hiddenInput.focus());

  // Start
  renderRound();
  hiddenInput.focus();
}
