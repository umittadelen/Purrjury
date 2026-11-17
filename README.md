# Purrjury

A daily logic puzzle about lying cats.

Play it here: [purrjury.com](https://purrjury.com/)

## The game

You get a grid of cats (currently 3x3 or 4x4 on the website, but can be changed by simple commands). Every cat is either **honest** or a **liar**: honest cats always tell the truth, liars always lie. Each cat says one thing, for example:

- "Felix is a liar."
- "Exactly 2 of the cats in row 3 are liars."
- "Doodle and Hobbes are both honest, or both liars."

Find out which cats are lying. Every puzzle has exactly one answer, and you can always reach it with logic alone, no guessing (also note that you don't have to juggle multiple cats at a time, there's always a cat that reveals another at all times (might change later, I HAVE THE POWER TO).

There's a new 3x3 and 4x4 puzzle every day.

## How to play

- One cat is already solved for you. Start with its clue (or any clue that talks about that cat)
- Right click or long-press a cat to see which cats talk about it.
- Tap a cat to mark it honest, tap again for liar, once more to clear it.
- Once every cat is marked, press **Submit**.
- YOU ARE A COWARD AND CAN'T SOLVE? **Hint** shows a clue that can find a new cat right now.


## Tips and tricks

When a cat lies, that doesn't mean the opposite of its clue is true. A liar's clue is false, nothing more. "Bean and I are both liars" being false means at least one of them is honest, not that both are. "Exactly 2 of my neighbors are liars" being false means any number but 2.

Clues about the speaker are the best way in, since they usually reveal the cat itself. When a cat talks about a group it's part of, think about it both ways: what if it's honest, what if it's a liar? Often only one works.

Stuck? Try a "what if". Pick a cat and pretend it's honest. Follow the clues. If something breaks, it's a liar. If nothing breaks, try the other way. Although this is never necessary: every puzzle can be solved with no guessing. At every step, at least one clue finds a new cat on its own.

**Hint** shows a clue you can use right now. Pressing it again shows which cat it finds.

## What the words mean

- **Neighbors:** the cats directly above, below, left and right. Not diagonal. A cat is not its own neighbor.
- **"Me" and "I" count:** "2 of Bean, Cleo and me" includes the speaker.
- **Corners:** the four corner cats. **Edges:** every cat on the outside of the grid.
- **Connected:** the cats touch each other through neighbors, in one group.
- **"More liars in A than in B":** A has more. The same number is not more.
- **"Only":** that cat is a liar, and no other cat in the group is.
- **"Odd":** 1, 3, 5... Zero is even.

## How the puzzles are made

Every puzzle is made by a program that solves it step by step, like a person would. It only keeps a puzzle if:

- it has exactly one answer,
- you never have to guess: every cat can be worked out from the clues,
- no single clue gives away a bunch of cats at once, to make the puzzles longer and more fun.

Each clue means exactly what it says, nothing more. A new 3x3 and 4x4 come out every day at midnight, your time.

## Credits

MEEEEEEEEE

Purrjury is made by myself, inspired by Clues by Sam.
