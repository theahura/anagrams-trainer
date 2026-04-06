from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

    page.goto('http://localhost:8766')
    page.wait_for_load_state('networkidle')

    # Read what the puzzle data says for today's root words
    puzzle_json = page.evaluate("""
        async () => {
            const resp = await fetch('./games/reword/data/puzzles.json');
            return await resp.json();
        }
    """)

    # Get today's puzzle via the game module
    puzzle_info = page.evaluate("""
        async () => {
            const { selectDailyPuzzle } = await import('./games/reword/src/game.js');
            const resp = await fetch('./games/reword/data/puzzles.json');
            const data = await resp.json();
            const today = new Date();
            const dateStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth()+1).padStart(2,'0')}-${String(today.getUTCDate()).padStart(2,'0')}`;
            const puzzle = selectDailyPuzzle(data, dateStr);
            return puzzle.map(r => ({
                root: r.root,
                offeredLetters: r.offeredLetters,
                expansions: r.expansions
            }));
        }
    """)

    print(f"Today's puzzle has {len(puzzle_info)} rounds")

    # Try to find a valid answer for round 1
    round1 = puzzle_info[0]
    print(f"Round 1: root='{round1['root']}', offered={round1['offeredLetters']}")

    # Find a non-trivial answer
    valid_answer = None
    for letter, words in round1['expansions'].items():
        if letter in round1['offeredLetters']:
            for word in words:
                if round1['root'] not in word:
                    valid_answer = word
                    break
        if valid_answer:
            break

    if valid_answer:
        print(f"Valid answer for round 1: '{valid_answer}'")

        # Type the valid answer
        hidden_input = page.locator('#hidden-input')
        hidden_input.focus()
        page.keyboard.type(valid_answer)
        page.wait_for_timeout(200)

        page.screenshot(path='tests/screenshots/07_valid_answer.png')

        # Submit
        page.keyboard.press('Enter')
        page.wait_for_timeout(200)

        msg = page.locator('#message').text_content()
        print(f"After submit: '{msg}'")

        page.screenshot(path='tests/screenshots/08_after_submit.png')

        # Wait for next round
        page.wait_for_timeout(800)
    else:
        print("No valid answer found for round 1, skipping")
        page.locator('#skip-btn').click()
        page.wait_for_timeout(800)

    # Skip remaining rounds to get to score screen
    for i in range(2, 12):
        round_text = page.locator('#round-indicator').text_content()
        print(f"Skipping {round_text}")
        page.locator('#skip-btn').click()
        page.wait_for_timeout(800)

    # Check score screen
    page.screenshot(path='tests/screenshots/09_score_screen.png')

    score_screen = page.locator('#score-screen')
    if score_screen.is_visible():
        print(f"Score screen visible: YES")
        print(f"Score screen content: {score_screen.text_content()}")
    else:
        print("Score screen NOT visible!")

    if logs:
        print("\n--- Console Logs ---")
        for log in logs[:10]:
            print(log)

    print("\nFull game test completed!")
    browser.close()
