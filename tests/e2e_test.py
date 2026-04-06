from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Add console log capture
    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: logs.append(f"[ERROR] {err}"))

    page.goto('http://localhost:8766')
    page.wait_for_load_state('networkidle')

    # Take initial screenshot
    page.screenshot(path='tests/screenshots/01_initial.png')
    print("Screenshot 1: Initial load")

    # Check game loaded
    header = page.locator('header h1')
    assert header.is_visible(), "Header should be visible"
    print(f"Header text: {header.text_content()}")

    # Check round indicator
    round_indicator = page.locator('#round-indicator')
    assert "Round 1 of 11" in round_indicator.text_content()
    print(f"Round: {round_indicator.text_content()}")

    # Check root word tiles exist
    root_tiles = page.locator('#root-rack .tile')
    root_count = root_tiles.count()
    print(f"Root word tiles: {root_count}")
    assert root_count == 3, f"Round 1 should have 3-letter root, got {root_count} tiles"

    # Read root word
    root_word = ''
    for i in range(root_count):
        tile = root_tiles.nth(i)
        # Get just the letter (first char, ignoring the points span)
        text = tile.text_content()
        root_word += text[0]
    print(f"Root word: {root_word}")

    # Check offered letters
    offered_tiles = page.locator('#offered-rack .tile')
    offered_count = offered_tiles.count()
    print(f"Offered letters: {offered_count}")
    assert offered_count == 3, f"Should have 3 offered letters, got {offered_count}"

    offered_letters = ''
    for i in range(offered_count):
        text = offered_tiles.nth(i).text_content()
        offered_letters += text[0]
    print(f"Offered letters: {offered_letters}")

    # Check input area
    input_area = page.locator('#input-area')
    assert input_area.is_visible(), "Input area should be visible"
    empty_tiles = page.locator('#input-area .tile.empty')
    print(f"Empty input tiles: {empty_tiles.count()}")
    assert empty_tiles.count() == 4, f"Should have 4 empty tiles (3+1), got {empty_tiles.count()}"

    # Type some letters
    hidden_input = page.locator('#hidden-input')
    hidden_input.focus()
    hidden_input.type('test')

    page.screenshot(path='tests/screenshots/02_typed.png')
    print("Screenshot 2: After typing 'test'")

    # Check input tiles filled
    input_tiles = page.locator('#input-area .tile:not(.empty)')
    filled_count = input_tiles.count()
    print(f"Filled input tiles: {filled_count}")
    assert filled_count == 4, f"Should have 4 filled tiles, got {filled_count}"

    # Submit invalid word
    page.locator('#submit-btn').click()
    message = page.locator('#message')
    print(f"Message after invalid submit: {message.text_content()}")

    page.screenshot(path='tests/screenshots/03_invalid.png')
    print("Screenshot 3: After invalid submission")

    # Test skip
    page.locator('#skip-btn').click()
    page.wait_for_timeout(800)

    round_text = page.locator('#round-indicator').text_content()
    print(f"After skip: {round_text}")
    assert "Round 2 of 11" in round_text, f"Should be round 2, got: {round_text}"

    page.screenshot(path='tests/screenshots/04_round2.png')
    print("Screenshot 4: Round 2")

    # Print console logs
    if logs:
        print("\n--- Console Logs ---")
        for log in logs:
            print(log)

    print("\nAll checks passed!")
    browser.close()
