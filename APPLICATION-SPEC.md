# Anagrams Trainer - Application Specification

## Overview
A daily word game (HTML/JS web app) where players add a single letter to rearrange words into longer words, styled with Scrabble tiles.

## Game Flow
1. Player is presented 11 words, one at a time
2. For each word, player sees the root word plus a set of pseudo-random letters
3. Player must create a new word by adding exactly ONE of the offered letters and rearranging all letters
4. Example: root word "rind" + letters [g, e, r] → player could form "grind" (using g) or "diner" (using e)

## Word Difficulty Progression
- Words 1-3: 3-letter root words
- Words 4-6: 4-letter root words
- Words 7-9: 5-letter root words
- Word 10: 6-letter root word
- Word 11: 7+ letter root word

## Word Generation
- Use scrabblewordfinder.org API with one blank (e.g., "rind?" returns valid words containing rind's letters + one extra)
- Research the API by opening the site with Playwright to understand API calls

## Anti-Trivial-Word Rule
Players cannot form words that are simple morphological extensions of the root word:
- No adding s/es/ed/ing/er/est to the root
- No adding common prefixes (un-, re-, de-) to the root
- The answer must involve genuine rearrangement, not just appending/prepending

## Daily Consistency
- Each day generates a new set of root words and offered letters
- All players on the same day get the same puzzle (seeded by date)

## Scoring
- Timer tracks how long the player takes to complete all 11 words
- Score tracks total letters used across all words

## UI/UX
- Scrabble tile styling for all letters
- Player input appears as Scrabble tiles as they type
- Clean, game-like interface
