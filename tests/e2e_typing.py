from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: logs.append(f"[ERROR] {err}"))

    page.goto('http://localhost:8766')
    page.wait_for_load_state('networkidle')

    # Focus the hidden input and type
    hidden_input = page.locator('#hidden-input')
    hidden_input.focus()

    # Check initial state
    print(f"Hidden input value before: '{hidden_input.input_value()}'")
    print(f"Hidden input exists: {hidden_input.is_visible()}")

    # Type letter by letter
    page.keyboard.type('a')
    page.wait_for_timeout(200)
    print(f"After typing 'a': input value = '{hidden_input.input_value()}'")

    # Check input area tiles
    filled = page.locator('#input-area .tile:not(.empty)')
    empty = page.locator('#input-area .tile.empty')
    print(f"Filled tiles: {filled.count()}, Empty tiles: {empty.count()}")

    if filled.count() > 0:
        print(f"First filled tile text: '{filled.first.text_content()}'")

    page.screenshot(path='tests/screenshots/05_typing_debug.png')

    # Type more
    page.keyboard.type('bcd')
    page.wait_for_timeout(200)
    print(f"After typing 'abcd': input value = '{hidden_input.input_value()}'")

    filled = page.locator('#input-area .tile:not(.empty)')
    empty = page.locator('#input-area .tile.empty')
    print(f"Filled tiles: {filled.count()}, Empty tiles: {empty.count()}")

    page.screenshot(path='tests/screenshots/06_typing_abcd.png')

    if logs:
        print("\n--- Console Logs ---")
        for log in logs:
            print(log)

    browser.close()
