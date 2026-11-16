// The Hint button, and lesson 5's Next step.


// --- Hints ---
// export.py gives every clue a table: which honest/liar combinations of its cats fit the clue.
// The hint does what solver.py does with them: try every combination of the unknown cats,
// and a cat that comes out the same in every combination that fits is forced.

const MAX_UNKNOWN = 12;   // same as in solver.py: groups about more unknown cats than this are skipped


// does the clue fit this world? (world[i] is true if cat i is a liar)
function clueFits(clue, world) {
  if (!clue.bits) clue.bits = Uint8Array.from(atob(clue.table), ch => ch.charCodeAt(0));   // decode once
  let k = 0;
  clue.cats.forEach((cat, j) => { if (world[cat]) k |= 1 << j; });
  return (clue.bits[k >> 3] >> (k & 7)) & 1;
}


// the unknown cats these clues force, given the known cats (a Map of cat index -> true if liar)
function forcedCats(clues, known) {
  const unknown = [...new Set(clues.flatMap(clue => clue.cats))].filter(cat => !known.has(cat));
  if (unknown.length === 0 || unknown.length > MAX_UNKNOWN) return [];

  const world = puzzle().cats.map((_, i) => known.get(i) ?? false);
  const seen = unknown.map(() => new Set());   // the values each unknown cat had in combinations that fit
  for (let combo = 0; combo < 1 << unknown.length; combo++) {
    unknown.forEach((cat, j) => { world[cat] = Boolean(combo >> j & 1); });
    if (clues.every(clue => clueFits(clue, world))) unknown.forEach((cat, j) => seen[j].add(world[cat]));
  }
  return unknown.filter((cat, j) => seen[j].size === 1);
}


// outline one clue that can find a new cat right now, or one pair of clues if no clue works alone
function hint() {
  const p = puzzle();
  const s = state();
  if (s.solved || s.revealed || s.cardOpen) return;
  clearConnections();
  if (lesson()?.steps) return nextStep();

  // only marks that are right count as known, so a wrong mark can't send the hint the wrong way
  const known = new Map();
  let wrong = 0;
  s.marks.forEach((mark, i) => {
    if (mark === "unknown") return;
    if ((mark === "liar") === p.liars[i]) known.set(i, p.liars[i]);
    else wrong++;
  });
  const wrongNote = wrong > 0 ? ` (${wrong} of your marks ${wrong === 1 ? "is" : "are"} wrong)` : "";

  // pressed again: also show the cat (or cats) that clue finds. After that there's nothing more to show.
  if (hintCards.size && hintFinds.length) {
    if (hintFound.size) return;
    s.hints++;
    hintFound = new Set(hintFinds);
    const names = hintFinds.map(cat => p.cats[cat].name).join(" and ");
    showHintLabel(`${hintCards.size === 1 ? "this clue finds" : "these two clues find"} ${names}${wrongNote}`);
    return render();
  }

  // just one hint: the first clue (in grid order) that finds a cat on its own,
  // or if none does, the first pair of clues that finds one together
  const clues = p.cats.map((cat, i) => ({ i, clue: cat.clue })).filter(c => c.clue);
  const single = clues.find(c => forcedCats([c.clue], known).length > 0);
  let useful = [];
  let label = "";
  if (single) {
    useful = [single.i];
    hintFinds = forcedCats([single.clue], known);
    label = "this clue can find a cat right now";
  } else {
    pairSearch:
    for (let a = 0; a < clues.length; a++) {
      for (let b = a + 1; b < clues.length; b++) {
        const found = forcedCats([clues[a].clue, clues[b].clue], known);
        if (found.length > 0) {
          useful = [clues[a].i, clues[b].i];
          hintFinds = found;
          break pairSearch;
        }
      }
    }
    label = "combine these two clues to find a cat";
  }

  s.hints++;
  if (!s.playedOn) s.playedOn = todayKey();
  hintCards = new Set(useful);
  showHintLabel(useful.length ? label + wrongNote : "no hint found");
  render();
}


// the hint's small label above the grid
function showHintLabel(text) {
  legend.innerHTML = "";
  const tag = document.createElement("span");
  tag.className = "tag tag-hint";
  tag.textContent = text;
  legend.append(tag);
}


// the last lesson has only one way through, so its help can name the clue and the cat it gives:
// the first step whose cat isn't marked right yet
function nextStep() {
  const p = puzzle();
  const s = state();
  const step = lesson().steps.find(st => (s.marks[st.cat] === "liar") !== p.liars[st.cat] || s.marks[st.cat] === "unknown");
  if (!step) return;
  s.hints++;
  hintCards = new Set([step.speaker]);
  showHintLabel(step.text);
  render();
}


function clearHint() {
  hintFinds = [];
  hintFound.clear();
  if (hintCards.size === 0) return;
  hintCards.clear();
  legend.innerHTML = "";
}
