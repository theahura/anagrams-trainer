~~Make the whole thing use vue~~ DONE — Migrated to Vue 3 + Vite with SFC components

~~Remove the scrabble points, they aren't useful~~ DONE — Points span and SCRABBLE_POINTS map removed from tiles

~~Come up with a better name for the app~~ DONE — Renamed to "Reword"

~~Sound should be in a menu for settings. Also sounds should use 'tile click' sounds, not whatever it currently is~~ DONE — Tile click uses filtered noise burst; mute toggle in header

~~Make it look a bit more modern overall, the current brand is a bit too 'early 2000s html'. It should be more minimalist, maybe more like wordle? Black tiles with white font?~~ DONE — Dark theme (#121213 bg, #d7dadc text, sharp tiles, green accents)

~~There should be a how-to-play section when you first open the game~~ DONE — Modal auto-shows on first visit, re-openable via ? icon

~~There should be a timer on the 'share' page showing when the next set of anagrams will be released~~ DONE — HH:MM:SS countdown to UTC midnight on score screen

~~Make it play nice on mobile~~ DONE — Flex column layout with 100svh, overscroll-behavior: none, touch-action: manipulation, safe area insets, responsive breakpoints at 420px and 340px

~~add a favicon (come up with a good simple svg logo)~~ DONE — Green tile with white "R" SVG favicon in public/favicon.svg

~~Make it so that each stage gives the player max one minute _counting down_ and show them their total cumulative time only at the end. If they cannot figure it out in one minute it should be equivalent to if they had pressed 'skip'~~ DONE — 60s countdown per round, auto-skip on timeout, cumulative time on score screen only
