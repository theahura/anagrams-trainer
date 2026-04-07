import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ScrabbleTile from '../games/reword/src/components/ScrabbleTile.vue';
import TileRack from '../games/reword/src/components/TileRack.vue';
import VirtualKeyboard from '../games/reword/src/components/VirtualKeyboard.vue';
import ScoreScreen from '../games/reword/src/components/ScoreScreen.vue';
import GameBoard from '../games/reword/src/components/GameBoard.vue';
import HowToPlay from '../games/reword/src/components/HowToPlay.vue';

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

  it('renders lifetime stats section when lifetimeStats prop is provided', () => {
    const lifetimeStats = {
      totalLetters: 150,
      totalWords: 30,
      fastestTimeMs: 45000,
      totalTimeMs: 300000,
      gamesPlayed: 5,
      bestLetterScore: 40,
      longestWord: 'strange',
      totalSkips: 8,
      perfectGamesPlayed: 3,
      perfectGamesTotalTimeMs: 180000,
    };
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000, lifetimeStats },
    });
    expect(wrapper.text()).toContain('Lifetime Stats');
    expect(wrapper.text()).toContain('150');
    expect(wrapper.text()).toContain('30');
    expect(wrapper.text()).toContain('0:45'); // fastest time
    expect(wrapper.text()).toContain('1:00'); // avg time = 180000 / 3 = 60000ms
    expect(wrapper.text()).toContain('STRANGE');
  });

  it('does not render lifetime stats section when lifetimeStats prop is null', () => {
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000, lifetimeStats: null },
    });
    expect(wrapper.text()).not.toContain('Lifetime Stats');
  });

  it('shows N/A for avg time and fastest time when no perfect games played', () => {
    const lifetimeStats = {
      totalLetters: 50, totalWords: 8, fastestTimeMs: null,
      totalTimeMs: 100000, gamesPlayed: 2, bestLetterScore: 30,
      longestWord: 'test', totalSkips: 3,
      perfectGamesPlayed: 0, perfectGamesTotalTimeMs: 0,
    };
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000, lifetimeStats },
    });
    const text = wrapper.text();
    // Should show N/A for both fastest and avg since no perfect games
    expect(text).toMatch(/Fastest Time.*N\/A|N\/A.*Fastest Time/s);
    expect(text).toMatch(/Avg Time.*N\/A|N\/A.*Avg Time/s);
  });

  it('computes avg time from perfect games only', () => {
    const lifetimeStats = {
      totalLetters: 150, totalWords: 30, fastestTimeMs: 30000,
      totalTimeMs: 500000, gamesPlayed: 10, bestLetterScore: 40,
      longestWord: 'strange', totalSkips: 8,
      perfectGamesPlayed: 2, perfectGamesTotalTimeMs: 90000,
    };
    const wrapper = mount(ScoreScreen, {
      props: { results, dateStr: '2026-04-05', totalTimeMs: 12000, lifetimeStats },
    });
    // Avg = 90000 / 2 = 45000ms = 0:45
    expect(wrapper.text()).toContain('0:45');
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
});
