[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/somanybaby/makefun-cooking-game-20261125/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/somanybaby/makefun-cooking-game-20261125/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Golden Ladle Kitchen

A one-cook rush kitchen: orders roll in on the board, you run the
kitchen alone — grab ingredients, grill the patties, stack each dish
on the assembly plate, and ring the bell at the serving window before
the ticket runs out. A complete, original cooking game that plays
offline in a desktop browser from its own static files.

## How to play

- **Move** with WASD / arrow keys, or click the floor to walk there.
- **E** (or click a counter while standing by it) uses it:
  - **Buns / Lettuce / Tomato / Cheese** — grab one (hands hold two).
  - **Grill** — start a patty, take it when the ring turns green.
    Leave it too long and it burns.
  - **Assembly** — add what you carry to the plate; pick the plate
    up when it matches an order; **Q** clears the plate.
  - **Serve** — hand a finished plate over. A matching plate pays
    the dish price plus a patience bonus and a combo bonus.
  - **Trash** — dump whatever you are carrying.
- Orders arrive with a patience bar. Three tickets walking out ends
  the shift. Finish the 150-second shift to complete the day, then
  Day 2 opens with faster tickets and the Double Trouble recipe.
- **P** pauses, **M** mutes, **R** restarts.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in desktop Chrome and cook. No build
step, no network request, no dependencies — the game is ES modules
and a canvas, all hand-drawn with vector shapes, and the sounds are
synthesized with WebAudio at run time.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json`.
- `game/index.html` — the page; `game/src/main.js` boots the loop.
- `game/src/game.js` — state machine, shift timer, scoring, combos.
- `game/src/kitchen.js` — station layout, grill slots, assembly plate.
- `game/src/orders.js` — the order board: tickets, patience, matching.
- `game/src/chef.js` — movement, collision, carrying.
- `game/src/render.js` — every pixel: kitchen, food, chef, HUD.
- `game/src/recipes.js` — the four house recipes.
- `game/src/audio.js` — synthesized sound effects, no audio files.
- `game/src/random.js` — seeded RNG for deterministic screenshots.
- `shots.json` — the four screenshot states (`?shot=…&seed=1`):
  cover (mid-assembly), start, serve, and the Day 2 rush.
- `vendor/makefun-game.ts` — make.fun's dossier library, unchanged.

## Screenshots

Four real renders of the game's own code, taken in headless Chromium
at 1280×800: `1-cover.jpg` (a dish mid-assembly), `2-start.jpg`
(the shift opening), `3-serve.jpg` (a finished plate at the bell),
`4-rush.jpg` (Day 2 with four tickets and twenty seconds left).
