export function createInputState() {
  return {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
  }
}

export function setupInputListeners(inputState) {
  const keyMap = {
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right',
    ArrowUp: 'jump',
    w: 'jump',
    W: 'jump',
    ' ': 'jump',
  }

  function onKeyDown(e) {
    const action = keyMap[e.key]
    if (!action) return
    e.preventDefault()
    if (action === 'jump' && !inputState.jump) {
      inputState.jumpPressed = true
    }
    inputState[action] = true
  }

  function onKeyUp(e) {
    const action = keyMap[e.key]
    if (!action) return
    e.preventDefault()
    inputState[action] = false
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  return () => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
  }
}

export function clearFrameInput(inputState) {
  inputState.jumpPressed = false
}
