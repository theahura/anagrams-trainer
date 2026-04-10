const STORAGE_KEY = 'speedrun-seen-how-to-play'

export function hasSeenHowToPlay() {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markHowToPlaySeen() {
  localStorage.setItem(STORAGE_KEY, '1')
}

export function setupHowToPlayModal() {
  const modal = document.getElementById('how-to-play-modal')
  const openBtn = document.getElementById('how-to-play-btn')
  const closeBtn = modal.querySelector('.htp-close')
  const controlsContainer = modal.querySelector('.htp-controls')

  function populateControls() {
    controlsContainer.innerHTML = `
      <div class="htp-section">
        <h3>Controls</h3>
        <div class="htp-row"><span class="htp-key">Arrow Keys / WASD</span><span>Move & Jump</span></div>
        <div class="htp-row"><span class="htp-key">Space / W / Up</span><span>Jump</span></div>
        <div class="htp-row"><span class="htp-key">E (tap)</span><span>Dash — quick burst of speed</span></div>
        <div class="htp-row"><span class="htp-key">E (hold)</span><span>Sprint — faster movement</span></div>
        <div class="htp-row"><span class="htp-key">R</span><span>Restart run</span></div>
      </div>
      <div class="htp-section">
        <h3>Advanced</h3>
        <div class="htp-row"><span class="htp-key">Wall + direction</span><span>Wall slide & wall jump</span></div>
        <div class="htp-row"><span class="htp-key">Corner edges</span><span>Corner vault — momentum boost</span></div>
      </div>
    `
  }

  function openModal() {
    modal.classList.remove('hidden')
  }

  function closeModal() {
    modal.classList.add('hidden')
  }

  populateControls()

  openBtn.addEventListener('click', openModal)
  closeBtn.addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal()
  })

  if (!hasSeenHowToPlay()) {
    markHowToPlaySeen()
    openModal()
  }

  return {
    isOpen: () => !modal.classList.contains('hidden'),
    close: closeModal,
  }
}
