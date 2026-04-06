import { isValidAnswer, calculateScore, getAnswersForRound, generateShareText, matchTypedToTiles, getSubmitFeedbackType } from './game.js';

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

export function initUI(puzzle, dateStr) {
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
  offeredLabel.textContent = 'Add Letters';
  container.appendChild(offeredLabel);

  const offeredRack = document.createElement('div');
  offeredRack.className = 'tile-rack';
  offeredRack.id = 'offered-rack';
  container.appendChild(offeredRack);

  // Instructions
  const instructions = document.createElement('div');
  instructions.className = 'instructions';
  instructions.textContent = 'Type a new word using all root letters + one or more offered letters';
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
    const minLen = round.root.length + 1;
    const displayLen = Math.max(minLen, state.inputLetters.length);

    const { matched, pool } = matchTypedToTiles(
      state.inputLetters,
      round.root.split(''),
      round.offeredLetters
    );

    for (let i = 0; i < displayLen; i++) {
      if (i < state.inputLetters.length) {
        const cls = matched[i].source === 'invalid' ? 'invalid' : '';
        inputArea.appendChild(createTile(state.inputLetters[i], { className: cls }));
      } else {
        inputArea.appendChild(createTile('', { className: 'empty' }));
      }
    }

    // Update rack tile highlights
    const rootTiles = rootRack.querySelectorAll('.tile');
    rootTiles.forEach((tile, i) => {
      tile.classList.toggle('used', pool[i] && pool[i].used);
    });

    const offeredTiles = offeredRack.querySelectorAll('.tile');
    offeredTiles.forEach((tile, i) => {
      const poolIdx = round.root.length + i;
      tile.classList.toggle('used', pool[poolIdx] && pool[poolIdx].used);
    });
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

  function triggerShake() {
    inputArea.classList.remove('shake');
    void inputArea.offsetWidth;
    inputArea.classList.add('shake');
    inputArea.addEventListener('animationend', () => {
      inputArea.classList.remove('shake');
    }, { once: true });
  }

  function triggerBounce() {
    const tiles = inputArea.querySelectorAll('.tile');
    tiles.forEach((tile, i) => tile.style.setProperty('--tile-index', i));
    inputArea.classList.add('bounce');
    const lastTile = tiles[tiles.length - 1];
    if (lastTile) {
      lastTile.addEventListener('animationend', () => {
        inputArea.classList.remove('bounce');
      }, { once: true });
    }
  }

  function handleSubmit() {
    if (!state.startTime) startTimer();
    const round = puzzle[state.currentRound];
    const answer = state.inputLetters.join('');
    const feedback = getSubmitFeedbackType(answer, round);

    if (feedback === 'invalid-length') {
      const minLen = round.root.length + 1;
      const maxLen = round.root.length + round.offeredLetters.length;
      setMessage(`Word must be ${minLen}-${maxLen} letters`, 'error');
      triggerShake();
      return;
    }

    if (feedback === 'wrong') {
      setMessage('Not a valid answer. Try again!', 'error');
      triggerShake();
      return;
    }

    const timeMs = Date.now() - state.roundStartTime;
    const possibleAnswers = getAnswersForRound(round);
    state.completedRounds.push({ answer, timeMs, root: round.root, possibleAnswers });
    setMessage('Correct!', 'success');
    triggerBounce();
    setTimeout(() => advanceRound(), 700);
  }

  function handleSkip() {
    if (!state.startTime) startTimer();
    const round = puzzle[state.currentRound];
    const timeMs = Date.now() - state.roundStartTime;
    const possibleAnswers = getAnswersForRound(round);
    state.completedRounds.push({ answer: '', timeMs, root: round.root, possibleAnswers });
    if (possibleAnswers.length > 0) {
      setMessage(`Possible: ${possibleAnswers.slice(0, 3).join(', ')}`, '');
      setTimeout(() => advanceRound(), 1200);
    } else {
      setMessage('Skipped', '');
      advanceRound();
    }
  }

  function fadeOutGameArea() {
    rootRack.classList.add('fade-out');
    offeredRack.classList.add('fade-out');
    inputArea.classList.add('fade-out');
  }

  function fadeInGameArea() {
    rootRack.classList.remove('fade-out');
    offeredRack.classList.remove('fade-out');
    inputArea.classList.remove('fade-out');
    rootRack.classList.add('fade-in');
    offeredRack.classList.add('fade-in');
    inputArea.classList.add('fade-in');

    const cleanup = () => {
      rootRack.classList.remove('fade-in');
      offeredRack.classList.remove('fade-in');
      inputArea.classList.remove('fade-in');
    };
    rootRack.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 300);
  }

  function advanceRound() {
    state.currentRound++;
    if (state.currentRound >= 11) {
      showScore();
      return;
    }
    fadeOutGameArea();
    setTimeout(() => {
      renderRound();
      fadeInGameArea();
      startTimer();
    }, 600);
  }

  function showScore(savedResults) {
    clearInterval(state.timerInterval);

    const results = savedResults || state.completedRounds;
    const totalTimeMs = savedResults
      ? results.reduce((sum, r) => sum + r.timeMs, 0)
      : Date.now() - state.startTime;
    const completed = results.filter(r => r.answer.length > 0);
    const score = calculateScore(completed);

    const mins = Math.floor(totalTimeMs / 1000 / 60);
    const secs = Math.floor(totalTimeMs / 1000) % 60;

    // Hide game elements
    rootRack.parentElement.querySelectorAll('.section-label, .tile-rack, #input-area, #submit-btn, #skip-btn, .instructions')
      .forEach(el => el.style.display = 'none');

    // Build per-round HTML
    let roundsHtml = '<div class="rounds-summary">';
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const solved = r.answer.length > 0;
      const statusClass = solved ? 'solved' : 'skipped';
      const answerDisplay = solved ? r.answer.toUpperCase() : 'SKIPPED';
      const possibleDisplay = !solved && r.possibleAnswers && r.possibleAnswers.length > 0
        ? `<span class="possible-answers">${r.possibleAnswers.join(', ')}</span>`
        : '';

      roundsHtml += `
        <div class="round-result ${statusClass}">
          <span class="round-num">${i + 1}</span>
          <span class="round-root">${r.root.toUpperCase()}</span>
          <span class="round-arrow">&rarr;</span>
          <span class="round-answer">${answerDisplay}</span>
          ${possibleDisplay}
        </div>`;
    }
    roundsHtml += '</div>';

    scoreScreen.style.display = 'block';
    scoreScreen.innerHTML = `
      <h2>Game Complete!</h2>
      <div class="stats-row">
        <div class="stat">Words Solved<br><span class="stat-value">${score.roundsCompleted} / 11</span></div>
        <div class="stat">Total Letters<br><span class="stat-value">${score.totalLetters}</span></div>
        <div class="stat">Total Time<br><span class="stat-value">${mins}:${secs.toString().padStart(2, '0')}</span></div>
      </div>
      <button id="share-btn">Share Results</button>
      ${roundsHtml}
    `;

    document.getElementById('share-btn').addEventListener('click', async () => {
      const shareText = generateShareText(results, dateStr, totalTimeMs);
      const btn = document.getElementById('share-btn');
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
        btn.textContent = 'Copied!';
      } catch (e) {
        btn.textContent = 'Could not copy';
      }
      setTimeout(() => { btn.textContent = 'Share Results'; }, 2000);
    });

    // Save to localStorage if this is a fresh game (not loaded from saved)
    if (!savedResults && dateStr) {
      try {
        localStorage.setItem('anagram-trainer-' + dateStr, JSON.stringify({
          results: state.completedRounds,
          totalTimeMs,
        }));
      } catch (e) { /* localStorage might be unavailable */ }
    }
  }

  // Keyboard handling
  hiddenInput.addEventListener('input', (e) => {
    if (!state.startTime) startTimer();
    const round = puzzle[state.currentRound];
    const maxLen = round.root.length + round.offeredLetters.length;
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

  // Check if today's puzzle was already completed
  if (dateStr) {
    try {
      const saved = localStorage.getItem('anagram-trainer-' + dateStr);
      if (saved) {
        const { results } = JSON.parse(saved);
        showScore(results);
        return;
      }
    } catch (e) { /* localStorage might be unavailable */ }
  }

  // Start
  renderRound();
  hiddenInput.focus();
}
