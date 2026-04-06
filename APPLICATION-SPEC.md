~~When I have the word ski, i tried typing risk and it didnt work~~ FIXED: removed 3-word-per-letter cap that dropped valid answers

~~All words should work for a given input~~ FIXED: raised cap to 5 words per expansion key

~~It also shouldnt just be 1 letter, right now im limited to only one letter. I should be able to use multiple on the same word, eg. rind --> grinder~~ FIXED: multi-letter expansion support added (1-3 offered letters)

~~Use the actual website too, right now i think the words are hardcoded~~ FIXED: added web-sourced build pipeline using wordunscrambler.me (`npm run build:words:web`), with caching and rate limiting

~~I got the word 'aster' and tried to play 'master', but it did not work. Why? Tasers also did not work~~ FIXED: removed trivial extension filter that was rejecting words containing the root as a substring (e.g., "master" contains "aster"). All valid dictionary words are now accepted. Note: "tasers" is not in the TWL06 dictionary (trademark word), so it will remain unavailable.
