import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ScrabbleTile from '../src/components/ScrabbleTile.vue';
import TileRack from '../src/components/TileRack.vue';
import VirtualKeyboard from '../src/components/VirtualKeyboard.vue';
import ScoreScreen from '../src/components/ScoreScreen.vue';
import GameBoard from '../src/components/GameBoard.vue';
import HowToPlay from '../src/components/HowToPlay.vue';
import App from '../src/components/App.vue';

describe('ScrabbleTile', () => {
  it('renders the letter in uppercase', () => {
    const wrapper = mount(ScrabbleTile, { props: { letter: 'a' } });
    expect(wrapper.text()).toContain('A');
  });

  it('does not display Scrabble point values', () => {
    const wrapper = mount(ScrabbleTile, { props: { letter: 'q' } });
    expect(wrapper.find('.points').exists()).toBe(false);
  });

  it('renders an empty tile when letter is empty string', () => {
    const wrapper = mount(ScrabbleTile, { props: { letter: '', tileClass: 'empty' } });
    expect(wrapper.find('.tile').classes()).toContain('empty');
  });

  it('applies the tileClass prop', () => {
    const wrapper = mount(ScrabbleTile, { props: { letter: 'r', tileClass: 'offered' } });
    expect(wrapper.find('.tile').classes()).toContain('offered');
  });
});

describe('TileRack', () => {
  it('renders each letter visibly', () => {
    const wrapper = mount(TileRack, { props: { letters: ['c', 'a', 't'] } });
    expect(wrapper.text()).toContain('C');
    expect(wrapper.text()).toContain('A');
    expect(wrapper.text()).toContain('T');
  });

  it('renders nothing for empty array', () => {
    const wrapper = mount(TileRack, { props: { letters: [] } });
    expect(wrapper.text()).toBe('');
  });

  it('applies tileClass to rendered tiles', () => {
    const wrapper = mount(TileRack, { props: { letters: ['x', 'y'], tileClass: 'offered' } });
    const tiles = wrapper.findAll('.tile');
    tiles.forEach(tile => expect(tile.classes()).toContain('offered'));
  });
});

describe('VirtualKeyboard', () => {
  it('renders all letter keys and action keys', () => {
    const wrapper = mount(VirtualKeyboard);
    const text = wrapper.text();
    for (const letter of 'QWERTYUIOPASDFGHJKLZXCVBNM') {
      expect(text).toContain(letter);
    }
  });

  it('emits key-press with the letter when a letter key is clicked', async () => {
    const wrapper = mount(VirtualKeyboard);
    const qKey = wrapper.findAll('.keyboard-key').find(k => k.text() === 'Q');
    await qKey.trigger('click');
    expect(wrapper.emitted('key-press')).toBeTruthy();
    expect(wrapper.emitted('key-press')[0]).toEqual(['q']);
  });

  it('emits key-press with Enter when Enter key is clicked', async () => {
    const wrapper = mount(VirtualKeyboard);
    const enterKey = wrapper.findAll('.keyboard-key').find(k => k.attributes('data-key') === 'Enter');
    await enterKey.trigger('click');
    expect(wrapper.emitted('key-press')[0]).toEqual(['Enter']);
  });

  it('emits key-press with Backspace when Backspace key is clicked', async () => {
    const wrapper = mount(VirtualKeyboard);
    const bsKey = wrapper.findAll('.keyboard-key').find(k => k.attributes('data-key') === 'Backspace');
    await bsKey.trigger('click');
    expect(wrapper.emitted('key-press')[0]).toEqual(['Backspace']);
  });
});

describe('ScoreScreen', () => {
  const results = [
    { answer: 'coat', timeMs: 5000, root: 'cat', possibleAnswers: ['coat', 'taco'] },
    { answer: '', timeMs: 3000, root: 'dog', possibleAnswers: ['gods'] },
    { answer: 'diner', timeMs: 4000, root: 'rind', possibleAnswers: ['diner', 'drink'] },
  ];

  it('displays the correct number of solved rounds', () => {
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000 },
    });
    expect(wrapper.text()).toContain('2 / 11');
  });

  it('displays total letters', () => {
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000 },
    });
    // coat(4) + diner(5) = 9
    expect(wrapper.text()).toContain('9');
  });

  it('shows SKIPPED for rounds with no answer', () => {
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000 },
    });
    expect(wrapper.text()).toContain('SKIPPED');
  });

  it('displays per-round root words', () => {
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000 },
    });
    expect(wrapper.text()).toContain('CAT');
    expect(wrapper.text()).toContain('DOG');
    expect(wrapper.text()).toContain('RIND');
  });

  it('displays a countdown timer for next puzzle', () => {
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000 },
    });
    // Should show "Next puzzle in:" label
    expect(wrapper.text()).toContain('Next puzzle in');
  });
});

describe('GameBoard', () => {
  const round = {
    root: 'cat',
    expansions: { o: ['coat', 'taco'], r: ['cart'] },
    offeredLetters: ['o', 'r', 'z'],
  };

  it('renders root word tiles', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: [], message: '', messageType: '' },
    });
    expect(wrapper.text()).toContain('C');
    expect(wrapper.text()).toContain('A');
    expect(wrapper.text()).toContain('T');
  });

  it('renders offered letter tiles', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: [], message: '', messageType: '' },
    });
    expect(wrapper.text()).toContain('O');
    expect(wrapper.text()).toContain('R');
    expect(wrapper.text()).toContain('Z');
  });

  it('renders input tiles for typed letters', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: ['c', 'o'], message: '', messageType: '' },
    });
    const inputArea = wrapper.find('#input-area');
    const tiles = inputArea.findAll('.tile');
    expect(tiles.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the round number', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 5, inputLetters: [], message: '', messageType: '' },
    });
    expect(wrapper.text()).toContain('Round 5 of 11');
  });

  it('displays an error message', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: [], message: 'Not a valid answer', messageType: 'error' },
    });
    const msg = wrapper.find('#message');
    expect(msg.text()).toBe('Not a valid answer');
    expect(msg.classes()).toContain('error');
  });

  it('emits submit when submit button is clicked', async () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: ['c', 'o', 'a', 't'], message: '', messageType: '' },
    });
    await wrapper.find('#submit-btn').trigger('click');
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('emits skip when skip button is clicked', async () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: [], message: '', messageType: '' },
    });
    await wrapper.find('#skip-btn').trigger('click');
    expect(wrapper.emitted('skip')).toBeTruthy();
  });

  it('applies animationClass to the input area', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: ['c', 'o', 'a', 't'], message: '', messageType: '', animationClass: 'shake' },
    });
    const inputArea = wrapper.find('#input-area');
    expect(inputArea.classes()).toContain('shake');
  });

  it('sets --tile-index on input tiles for staggered animation', () => {
    const wrapper = mount(GameBoard, {
      props: { round, roundNumber: 1, inputLetters: ['c', 'o', 'a', 't'], message: '', messageType: '' },
    });
    const inputArea = wrapper.find('#input-area');
    const tiles = inputArea.findAll('.tile');
    for (let i = 0; i < 4; i++) {
      const style = tiles[i].attributes('style') || '';
      expect(style).toContain(`--tile-index: ${i}`);
    }
  });
});

describe('HowToPlay', () => {
  it('renders game rules', () => {
    const wrapper = mount(HowToPlay);
    expect(wrapper.text()).toContain('How to Play');
  });

  it('describes the core mechanic of adding letters', () => {
    const wrapper = mount(HowToPlay);
    const text = wrapper.text().toLowerCase();
    // Should mention adding a letter and rearranging
    expect(text).toMatch(/add.*letter|letter.*add/);
  });

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(HowToPlay);
    const closeBtn = wrapper.find('[data-testid="close-how-to-play"]');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('mentions the 60-second time limit', () => {
    const wrapper = mount(HowToPlay);
    const text = wrapper.text().toLowerCase();
    expect(text).toMatch(/60 seconds/);
  });

  it('mentions letter-based scoring', () => {
    const wrapper = mount(HowToPlay);
    const text = wrapper.text().toLowerCase();
    expect(text).toMatch(/letters.*used|total letters/);
  });
});

describe('ScoreScreen possible answers cap', () => {
  it('shows all possible answers when 5 or fewer', () => {
    const results = [
      { answer: '', timeMs: 5000, root: 'cat', possibleAnswers: ['coat', 'taco', 'cart'] },
    ];
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 5000 },
    });
    expect(wrapper.text()).toContain('coat');
    expect(wrapper.text()).toContain('taco');
    expect(wrapper.text()).toContain('cart');
    expect(wrapper.text()).not.toContain('more');
  });

  it('caps possible answers at 5 and shows +N more when exceeded', () => {
    const results = [
      { answer: '', timeMs: 5000, root: 'cat', possibleAnswers: ['coat', 'taco', 'cart', 'arcs', 'scat', 'acts', 'cast'] },
    ];
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 5000 },
    });
    // First 5 should be visible
    expect(wrapper.text()).toContain('coat');
    expect(wrapper.text()).toContain('taco');
    expect(wrapper.text()).toContain('cart');
    expect(wrapper.text()).toContain('arcs');
    expect(wrapper.text()).toContain('scat');
    // 6th and 7th should NOT be visible as text
    expect(wrapper.text()).not.toContain('acts');
    expect(wrapper.text()).not.toContain('cast');
    // Should show "+2 more"
    expect(wrapper.text()).toContain('+2 more');
  });

  it('shows all 5 answers with no +more when exactly 5', () => {
    const results = [
      { answer: '', timeMs: 5000, root: 'cat', possibleAnswers: ['coat', 'taco', 'cart', 'arcs', 'scat'] },
    ];
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 5000 },
    });
    expect(wrapper.text()).toContain('coat');
    expect(wrapper.text()).toContain('scat');
    expect(wrapper.text()).not.toContain('more');
  });

  it('does not show possible answers for solved rounds', () => {
    const results = [
      { answer: 'coat', timeMs: 5000, root: 'cat', possibleAnswers: ['coat', 'taco', 'cart'] },
    ];
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 5000 },
    });
    expect(wrapper.find('.possible-answers').exists()).toBe(false);
  });
});

// Mock puzzle data matching the format App.vue expects
const mockPuzzleData = {
  3: [
    { root: 'cat', expansions: { o: ['coat', 'taco'], r: ['cart'], s: ['cast', 'acts'] } },
    { root: 'dog', expansions: { s: ['gods'], n: ['dong'], e: ['doge'] } },
    { root: 'pen', expansions: { i: ['pine'], a: ['nape', 'pane'], s: ['pens'] } },
    { root: 'bat', expansions: { e: ['beat', 'beta'], s: ['stab', 'tabs'], h: ['bath'] } },
  ],
  4: [
    { root: 'rind', expansions: { e: ['diner'], k: ['drink'], a: ['nadir', 'drain'] } },
    { root: 'lamp', expansions: { c: ['clamp'], s: ['psalm'], e: ['ample'] } },
    { root: 'tone', expansions: { s: ['stone', 'notes', 'onset'], r: ['tenor', 'noter'], d: ['noted'] } },
    { root: 'mare', expansions: { d: ['dream'], s: ['smear'], k: ['maker'] } },
  ],
  5: [
    { root: 'bread', expansions: { k: ['barked'], e: ['beader'], s: ['breads'] } },
    { root: 'flame', expansions: { r: ['flamre'], i: ['flamie'], s: ['flames'] } },
    { root: 'plant', expansions: { e: ['planet', 'platen'], s: ['plants'], i: ['plaint'] } },
    { root: 'heart', expansions: { d: ['thread', 'dearth', 'hatred'], w: ['wreath', 'thawer'], s: ['hearts'] } },
  ],
  6: [
    { root: 'garden', expansions: { e: ['angered', 'enraged'], i: ['reading', 'gradine'], s: ['gardens'] } },
    { root: 'listen', expansions: { g: ['singlet', 'tingler'], r: ['linters', 'slinter'], s: ['listens'] } },
  ],
  7: [
    { root: 'strange', expansions: { r: ['granters'], i: ['astringe'], s: ['stranges'] } },
    { root: 'pointed', expansions: { s: ['deposits', 'topsides'] } },
  ],
};

describe('App - Timer pauses during HowToPlay modal', () => {
  let fetchSpy;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    // Mock fetch to return puzzle data
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(mockPuzzleData),
    });
    // Clear localStorage
    localStorage.clear();
    // Mark how-to-play as seen so it doesn't auto-show
    localStorage.setItem('reword-seen-how-to-play', '1');
    // Mock AudioContext to avoid Web Audio errors
    globalThis.AudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      resume: vi.fn(),
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        type: 'sine',
      }),
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }),
      createBiquadFilter: vi.fn().mockReturnValue({
        connect: vi.fn(), type: 'bandpass', frequency: { value: 0 }, Q: { value: 0 },
      }),
      createBuffer: vi.fn().mockReturnValue({ getChannelData: () => new Float32Array(100) }),
      createBufferSource: vi.fn().mockReturnValue({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null,
      }),
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.AudioContext;
  });

  it('does not auto-skip a round while HowToPlay modal is open', async () => {
    const wrapper = mount(App);
    await flushPromises();
    // Timer starts via onRoundEntered after transition — simulate it
    vi.advanceTimersByTime(0);
    await flushPromises();

    // Game should be loaded and on round 1
    expect(wrapper.text()).toContain('Round 1 of 11');

    // Advance timer 30 seconds into the round
    vi.advanceTimersByTime(30000);
    await flushPromises();

    // Still on round 1
    expect(wrapper.text()).toContain('Round 1 of 11');

    // Open HowToPlay modal via the "?" button
    const helpBtn = wrapper.find('.header-icon');
    await helpBtn.trigger('click');
    await flushPromises();

    // Modal should be visible
    expect(wrapper.findComponent(HowToPlay).exists()).toBe(true);

    // Advance time by 40 seconds (total would be 70s if timer wasn't paused — exceeds 60s limit)
    vi.advanceTimersByTime(40000);
    await flushPromises();

    // Should still be on round 1 — timer was paused
    expect(wrapper.text()).toContain('Round 1 of 11');
    // Should NOT have advanced to round 2
    expect(wrapper.text()).not.toContain('Round 2 of 11');
  });

  it('resumes timer from paused position after closing HowToPlay modal', async () => {
    const wrapper = mount(App);
    await flushPromises();
    vi.advanceTimersByTime(0);
    await flushPromises();

    // Advance 50 seconds
    vi.advanceTimersByTime(50000);
    await flushPromises();
    expect(wrapper.text()).toContain('Round 1 of 11');

    // Open HowToPlay modal
    const helpBtn = wrapper.find('.header-icon');
    await helpBtn.trigger('click');
    await flushPromises();

    // Advance 20 seconds while modal is open (does nothing to timer)
    vi.advanceTimersByTime(20000);
    await flushPromises();

    // Close modal
    const closeBtn = wrapper.find('[data-testid="close-how-to-play"]');
    await closeBtn.trigger('click');
    await flushPromises();

    // Timer should resume from 50s elapsed. We need ~10 more seconds to auto-skip.
    // Advance 9 seconds — should still be on round 1
    vi.advanceTimersByTime(9000);
    await flushPromises();
    expect(wrapper.text()).toContain('Round 1 of 11');

    // Advance 2 more seconds — now 50+11 = 61s elapsed, should auto-skip
    vi.advanceTimersByTime(2000);
    await flushPromises();
    // Allow transition to complete
    vi.advanceTimersByTime(1500);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Round 1 of 11');
  });
});

describe('App - Escape key closes HowToPlay modal', () => {
  let fetchSpy;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(mockPuzzleData),
    });
    localStorage.clear();
    localStorage.setItem('reword-seen-how-to-play', '1');
    globalThis.AudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      resume: vi.fn(),
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        type: 'sine',
      }),
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }),
      createBiquadFilter: vi.fn().mockReturnValue({
        connect: vi.fn(), type: 'bandpass', frequency: { value: 0 }, Q: { value: 0 },
      }),
      createBuffer: vi.fn().mockReturnValue({ getChannelData: () => new Float32Array(100) }),
      createBufferSource: vi.fn().mockReturnValue({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null,
      }),
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.AudioContext;
  });

  it('closes HowToPlay modal when Escape is pressed', async () => {
    const wrapper = mount(App);
    await flushPromises();
    vi.advanceTimersByTime(0);
    await flushPromises();

    // Open HowToPlay modal
    const helpBtn = wrapper.find('.header-icon');
    await helpBtn.trigger('click');
    await flushPromises();
    expect(wrapper.findComponent(HowToPlay).exists()).toBe(true);

    // Press Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();

    // Modal should be closed
    expect(wrapper.findComponent(HowToPlay).exists()).toBe(false);
  });

  it('does not crash when Escape is pressed with no modal open', async () => {
    const wrapper = mount(App);
    await flushPromises();
    vi.advanceTimersByTime(0);
    await flushPromises();

    // Verify no modal
    expect(wrapper.findComponent(HowToPlay).exists()).toBe(false);

    // Press Escape — should do nothing
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();

    // Game should still be on round 1
    expect(wrapper.text()).toContain('Round 1 of 11');
  });
});

describe('App - Timer urgency feedback', () => {
  let fetchSpy;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(mockPuzzleData),
    });
    localStorage.clear();
    localStorage.setItem('reword-seen-how-to-play', '1');
    globalThis.AudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      resume: vi.fn(),
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        type: 'sine',
      }),
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }),
      createBiquadFilter: vi.fn().mockReturnValue({
        connect: vi.fn(), type: 'bandpass', frequency: { value: 0 }, Q: { value: 0 },
      }),
      createBuffer: vi.fn().mockReturnValue({ getChannelData: () => new Float32Array(100) }),
      createBufferSource: vi.fn().mockReturnValue({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null,
      }),
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.AudioContext;
  });

  it('adds urgent class to timer display when under 10 seconds remain', async () => {
    const wrapper = mount(App);
    await flushPromises();
    vi.advanceTimersByTime(0);
    await flushPromises();

    // At start (60s remaining), timer should not be urgent
    expect(wrapper.find('.timer-display.urgent').exists()).toBe(false);

    // Advance to 51 seconds (9 seconds remaining)
    vi.advanceTimersByTime(51000);
    await flushPromises();

    // Timer should now have urgent class
    expect(wrapper.find('.timer-display.urgent').exists()).toBe(true);
  });

  it('does not show urgent class when more than 10 seconds remain', async () => {
    const wrapper = mount(App);
    await flushPromises();
    vi.advanceTimersByTime(0);
    await flushPromises();

    // Advance to 30 seconds (30 seconds remaining)
    vi.advanceTimersByTime(30000);
    await flushPromises();

    // Timer should not be urgent
    expect(wrapper.find('.timer-display.urgent').exists()).toBe(false);
  });
});
