// The puzzle on screen: drawing the cards (render), marks, notes and tags, connections (right click / long-press),
// Submit and Check, Reset, Reveal, moving between puzzles, and fitting long clues into their cards.


// --- Game ---


function render() {
  const p = puzzle();
  const s = state();

  const level = levelOf(p);
  info.textContent = lesson()
    ? `How to play · ${current + 1} / ${list.length}`
    : DAILY_MODE ? `${dayLabel(dayOf[list[current]])} · ${sizeOf(p)}`   // the daily never shows a level
    : `${level[0].toUpperCase() + level.slice(1)} ${sizeOf(p)} · ${current + 1} / ${list.length}`;
  renderLesson();
  // the arrows: none on a daily puzzle (home has a tile for each), and no back arrow on the first lesson
  prevArrow.hidden = (lesson() !== null && current === 0) || dayOf[list[current]] !== undefined;
  nextArrow.hidden = lesson() === null && dayOf[list[current]] !== undefined;
  info.title = `seed ${p.seed}`;   // handy when someone reports a puzzle
  grid.dataset.cols = p.cols;   // lets the CSS shrink the clue text on narrow 4x4 cards
  grid.dataset.rows = p.rows;   // and give the lessons' one-row grids taller cards
  grid.style.setProperty("--cols", p.cols);
  grid.style.setProperty("--rows", p.rows);
  // on a computer the cards share the whole grid area (the CSS divides it into this many slots)
  grid.style.setProperty("--slots", Math.max(p.rows, p.cols));
  grid.innerHTML = "";
  grid.classList.toggle("connecting", highlight !== null);   // the CSS fades the cats that aren't involved

  // one card per cat
  p.cats.forEach((cat, i) => {
    const card = document.createElement("div");
    card.className = "card " + s.marks[i];
    card.style.setProperty("--coat", COAT_BAND[cat.color] || "#bbb");
    if (LIGHT_COATS.has(cat.color)) card.classList.add("light-coat");
    if (editing === i) card.classList.add("editing");
    // the bottom row's notes box opens upward on a computer, or Done would be below the screen
    if (editing === i && cat.row === p.rows - 1) card.classList.add("opens-up");
    if (i === p.given) card.classList.add("given");
    if (s.used[i]) card.classList.add("used");
    if (s.revealed) card.classList.add(p.liars[i] ? "answer-liar" : "answer-honest");
    // just solved: the cats hop in a wave from the top-left corner (see celebrate)
    if (celebrating) {
      card.classList.add("wave");
      card.style.setProperty("--wave", `${(cat.row + cat.column) * WAVE_STEP_MS}ms`);
    }

    // connections: the chosen cat, and either the cats that talk about it or the cats it talks about
    if (highlight !== null) {
      if (i === highlight) card.classList.add("focus");
      else if (cat.mentions.includes(highlight)) card.classList.add("talked-by");
    }
    if (hintCards.has(i) || guidePoints.has(i)) card.classList.add("hint");
    if (hintFound.has(i)) card.classList.add("hint-found");

    // header: the cat in the middle, its name and coat color under it, then a divider before the clue
    const top = document.createElement("div");
    top.className = "top";

    // the cat picture: its coat, with a face that matches what its clue says (angry for "X is a liar")
    const sprite = document.createElement("img");
    sprite.className = "sprite";
    sprite.src = `sprites/cat_${SPRITE_COAT[cat.color] || cat.color}_${cat.mood || "neutral"}.png`;
    sprite.alt = "";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = cat.name;

    const color = document.createElement("span");
    color.className = "color";
    color.textContent = cat.color;

    const nameLine = document.createElement("div");
    nameLine.className = "name-line";
    nameLine.append(name, color);

    top.append(sprite, nameLine);

    // honest / liar in the bottom corner (the card color shows it too), and a lock on the given cat
    const badge = document.createElement("span");
    badge.className = "badge";
    const markWord = document.createElement("span");
    markWord.className = "mark-word";
    markWord.textContent = s.marks[i] === "unknown" ? "" : s.marks[i];
    badge.append(markWord);
    if (i === p.given) {
      const lock = document.createElement("span");
      lock.className = "given-lock";
      lock.textContent = "🔒";
      lock.title = "Given: this cat is solved for you";
      badge.append(lock);
    }

    const text = document.createElement("p");
    text.className = cat.hidden ? "text gibberish" : "text";
    // the words go in a span, so fitText can measure them against the space the card has
    const words = document.createElement("span");
    words.textContent = cat.text;
    text.append(words);

    // small button to grey out a clue you're done with
    const usedToggle = document.createElement("button");
    usedToggle.className = "used-toggle";
    usedToggle.innerHTML = "&#10003;";
    usedToggle.title = "Grey out this clue";
    usedToggle.addEventListener("click", event => {
      event.stopPropagation();   // don't also change the mark
      s.used[i] = !s.used[i];
      render();
    });
    if (guidePoint?.point === "check" && guidePoint.cat === i) usedToggle.classList.add("point");

    // pen: open your notes and tags for this cat
    const pen = document.createElement("button");
    pen.className = "pen-toggle";
    if (s.notes[i] || s.tags[i].length) pen.classList.add("has-notes");
    pen.innerHTML = "&#9998;";
    pen.title = "Notes and tags";
    pen.addEventListener("click", event => {
      event.stopPropagation();   // don't also change the mark
      editing = editing === i ? null : i;
      render();
    });
    if (guidePoint?.point === "pen" && guidePoint.cat === i && editing !== i) pen.classList.add("point");

    // right click or long-press on these buttons does nothing: it shouldn't reach the card and show connections
    for (const button of [usedToggle, pen]) {
      button.addEventListener("contextmenu", event => { event.preventDefault(); event.stopPropagation(); });
      button.addEventListener("touchstart", event => event.stopPropagation(), { passive: true });
    }

    card.append(top, text, badge, usedToggle, pen);

    // your tags in a little row, and your note under the clue
    if (s.tags[i].length) {
      const chips = document.createElement("div");
      chips.className = "chips";
      TAGS.filter(tag => s.tags[i].includes(tag.id)).forEach(tag => chips.append(chip(tag)));
      card.append(chips);
    }
    if (editing === i) {
      card.append(noteEditor(i));
    } else if (s.notes[i]) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = s.notes[i];
      card.append(note);
    }

    // hidden cats only meow, after Reveal we show what they really said
    if (cat.hidden && s.revealed) {
      const secret = document.createElement("p");
      secret.className = "secret";
      secret.textContent = "Really said: " + cat.secret;
      card.append(secret);
    }
    // tap: change the mark (tap twice quickly for liar). right click or long-press: show connections
    // (while they show, a tap only closes them, see closeConnectionsOnClick)
    card.addEventListener("click", () => {
      if (longPressed) { longPressed = false; return; }
      cycleMark(i);
    });
    // right click: the cats that talk about it
    card.addEventListener("contextmenu", event => {
      event.preventDefault();   // no browser menu
      showConnections(i);
    });
    // long-press: the card sinks while you hold it, then the cats that talk about it
    card.addEventListener("touchstart", () => {
      card.classList.add("pressing");
      pressTimer = setTimeout(() => {
        longPressed = true;
        window.getSelection()?.removeAllRanges();   // in case the browser started selecting anyway
        navigator.vibrate?.(20);                    // a tiny buzz so you feel it worked (Android)
        showConnections(i);
      }, 500);
    }, { passive: true });
    const stopPress = () => { clearTimeout(pressTimer); card.classList.remove("pressing"); };
    card.addEventListener("touchend", stopPress);
    card.addEventListener("touchmove", stopPress);
    card.addEventListener("touchcancel", stopPress);
    grid.append(card);
  });

  fitText();
  // daily: the address follows the puzzle (switching to the 4x4 replaces it, so Back still goes home)
  if (dayOf[list[current]] && !game.hidden) {
    const address = `#${dayOf[list[current]]}/${sizeOf(p)}`;
    if (location.hash !== address) history.replaceState(history.state, "", address);
  }
  timer.textContent = formatTime(s.seconds);
  updateNudge();
  renderRating();
}


// Daily and feedback set: someone who can't find a way in should press Hint, not leave.
// Puzzles with no cat shown from the start: a line points at Hint until your first mark,
// and after NUDGE_SECONDS Hint pulses too. With a cat shown (its clue is the way in), both wait
// until GIVEN_NUDGE_SECONDS. Gone once you've marked a cat or used Hint.
const NUDGE_SECONDS = 30;
const GIVEN_NUDGE_SECONDS = 45;

function updateNudge() {
  if (MODE === "practice") return;
  const p = puzzle();
  const s = state();
  const nudge = !lesson() && s.moves === 0 && s.hints === 0
    && !s.solved && !s.revealed && !s.cardOpen && !s.sent
    && (p.given == null || s.seconds >= GIVEN_NUDGE_SECONDS);
  const line = legend.querySelector(".tag-nudge");
  if (nudge && legend.children.length === 0) {   // only when no hint or connections label is showing
    showHintLabel("Not sure where to start? Try Hint");
    legend.firstChild.classList.add("tag-nudge");
  } else if (!nudge && line) {
    legend.innerHTML = "";
  }
  // the lessons have their own guide, which points at Hint itself in lesson 4
  if (!lesson()) hintButton.classList.toggle("point", nudge && s.seconds >= NUDGE_SECONDS);
}


// daily and feedback set: Submit while playing. Daily: once solved, Hint and Submit
// make room for Share and Results (Results only while the card is closed).
function renderSubmitAndShare() {
  if (!FEEDBACK && !DAILY_MODE) return;
  const s = state();
  const done = !lesson() && (s.solved || s.revealed);
  checkButton.hidden = lesson() !== null || done;
  if (!DAILY_MODE) return;
  hintButton.hidden = done;
  shareButton.hidden = !done;
  resultsButton.hidden = !done || s.cardOpen;
  shareButton.textContent = copied ? "Copied!" : "Share";
}


// On a computer the grid is fitted to the screen, so a long clue may not fit its card.
// Shrink its font a little at a time until it does (never below MIN_TEXT_PX).
// On phones the cards just grow, so nothing overflows and nothing shrinks.
const MIN_TEXT_PX = 10;

function fitText() {
  for (const text of grid.querySelectorAll(".text")) {
    const words = text.firstChild;
    text.style.fontSize = "";
    let size = parseFloat(getComputedStyle(text).fontSize);
    while (words.getBoundingClientRect().height > text.clientHeight + 1 && size > MIN_TEXT_PX) {
      size -= 0.5;
      text.style.fontSize = size + "px";
    }
  }
}

// a lesson's bubble is measured for the window's width, so a resize measures it again (render also fits the text)
window.addEventListener("resize", () => {
  if (game.hidden) return;
  // a phone's keyboard opening is a resize too. Redrawing would replace the comment box and close the keyboard
  if (ratingBox.contains(document.activeElement)) return;
  if (lesson()) render();
  else fitText();
});


// one small tag chip: "?" or "!" as text, the colors as a dot
function chip(tag) {
  const span = document.createElement("span");
  span.className = "chip chip-" + tag.id;
  span.textContent = tag.label;
  span.title = tag.title;
  return span;
}


// the box the pen opens: tag buttons and a note field
function noteEditor(i) {
  const s = state();
  const box = document.createElement("div");
  box.className = "note-editor";
  // taps and presses in here belong to the editor: no mark changes, no connections, normal paste menu
  for (const type of ["click", "contextmenu", "touchstart"]) {
    box.addEventListener(type, event => event.stopPropagation());
  }

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";
  TAGS.forEach(tag => {
    const button = document.createElement("button");
    button.className = "tag-toggle";
    if (s.tags[i].includes(tag.id)) button.classList.add("on");
    button.title = tag.title;
    button.append(chip(tag));
    button.addEventListener("click", () => {
      s.tags[i] = s.tags[i].includes(tag.id) ? s.tags[i].filter(id => id !== tag.id) : [...s.tags[i], tag.id];
      render();
    });
    tagRow.append(button);
  });

  const field = document.createElement("textarea");
  field.rows = 2;
  // lesson 4's tour suggests what to write on its cat
  field.placeholder = lesson()?.tour?.find(step => step.done?.note === i)?.placeholder ?? "Note, e.g. honest if Hazel is";
  field.value = s.notes[i];
  field.addEventListener("input", () => { s.notes[i] = field.value; });   // no render here, it would lose the cursor

  const done = document.createElement("button");
  done.className = "note-done";
  done.textContent = "Done";
  done.addEventListener("click", () => { editing = null; render(); });

  box.append(tagRow, field, done);
  return box;
}


function cycleMark(i) {
  const s = state();
  if (s.solved || s.revealed || i === puzzle().given) return;   // the given cat can't be changed
  if (s.cardOpen) return;   // the rating card is open: the puzzle is stopped
  const next = (MARKS.indexOf(s.marks[i]) + 1) % MARKS.length;
  s.marks[i] = MARKS[next];
  s.markedAt[i] = ++s.moves;
  if (s.firstMarkAt === null) s.firstMarkAt = s.seconds;
  if (!s.playedOn) s.playedOn = todayKey();
  message.textContent = "";
  clearHint();   // the hint was for the old marks
  checkLesson();
  render();
}


// daily and feedback set: the Submit button. It only says yes or no, never which cat is wrong:
// naming one would give away its answer. Help with a cat is what Hint is for.
function submit() {
  const p = puzzle();
  const s = state();
  if (lesson() || s.solved || s.revealed || s.cardOpen) return;
  if (s.marks.includes("unknown")) {
    message.textContent = "Choose all cats before submitting.";   // not a mistake, nothing counted
    return;
  }
  s.checks++;
  if (s.marks.every((mark, i) => (mark === "liar") === p.liars[i])) {
    s.solved = true;
    message.textContent = "";
    // the wave first, then the card to rate it (unless it's rated already)
    return celebrate(() => { s.cardOpen = !s.sent; });
  } else {
    s.wrongChecks++;
    message.textContent = "Not quite, some marks are wrong. Stuck? Try a hint.";
  }
  render();
}


// the cats that talk about cat i (right click or long-press it). The other way round isn't shown:
// a clue's own text already says which cats it talks about.
function showConnections(i) {
  const cat = puzzle().cats[i];
  clearHint();
  highlight = i;
  // small label so you know what the outlines mean
  legend.innerHTML = "";
  const tag = document.createElement("span");
  tag.className = "tag tag-by";
  tag.textContent = `cats that talk about ${cat.name}`;
  legend.append(tag);
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(clearConnections, HIGHLIGHT_SECONDS * 1000);
  render();
}


// while connections show, any click anywhere closes them. On a card that's all it does (no mark change),
// buttons still do their thing too. Capture phase, so it runs before the card's own click.
// The tap that ends a long-press is let through: the card's click handler skips it.
function closeConnectionsOnClick(event) {
  if (highlight === null || longPressed) return;
  clearConnections();
  if (event.target.closest(".card")) event.stopPropagation();
}
document.addEventListener("click", closeConnectionsOnClick, true);


function clearConnections() {
  if (highlight === null) return;
  highlight = null;
  legend.innerHTML = "";
  clearTimeout(highlightTimer);
  render();
}


function check() {
  const p = puzzle();
  const s = state();
  if (s.solved || s.revealed) return;

  // compare every mark with the answer, unknown cats don't count as wrong
  let wrong = 0;
  let unknown = 0;
  s.marks.forEach((mark, i) => {
    if (mark === "unknown") unknown++;
    else if ((mark === "liar") !== p.liars[i]) wrong++;
  });

  s.checks++;
  if (wrong > 0) {
    s.wrongChecks++;
    message.textContent = `${wrong} of your marks ${wrong === 1 ? "is" : "are"} wrong. (mistakes: ${s.wrongChecks})`;
  } else if (unknown > 0) {
    message.textContent = `All your marks are right so far. ${unknown} cat${unknown === 1 ? "" : "s"} left.`;
  } else {
    s.solved = true;
    const hints = s.hints ? ` and ${s.hints} hint${s.hints === 1 ? "" : "s"}` : "";
    message.textContent = `Solved in ${formatTime(s.seconds)} with ${s.wrongChecks} mistake${s.wrongChecks === 1 ? "" : "s"}${hints}! 🐾`;
    celebrate();
  }
}


// Solved! The cats hop in a wave from the top-left corner (one diagonal every WAVE_STEP_MS) and "Purrfect!"
// shows above the grid. `then` runs once the wave is over, so the solved card doesn't cover it.
// With "reduce motion" on, the CSS skips the hops and only the text shows.
const WAVE_STEP_MS = 90;
let celebrating = false;

function celebrate(then) {
  const p = puzzle();
  celebrating = true;
  clearHint();
  render();
  showHintLabel("Purrfect! 🐾");
  legend.firstChild.classList.add("tag-purr");
  setTimeout(() => {
    celebrating = false;
    then?.();
    if (!game.hidden && puzzle() === p) render();   // only if you're still on this puzzle
  }, (p.rows + p.cols - 2) * WAVE_STEP_MS + 600);
}


function reset() {
  states[list[current]] = freshState(puzzle());
  editing = null;
  message.textContent = "";
  clearHint();
  render();
}


function reveal() {
  state().revealed = true;
  clearHint();
  message.textContent = "The outlines show the answer: green is honest, red is a liar.";
  render();
}


function go(step) {
  // the lessons go in order: no wrapping around, and past the last one is the menu
  if (lesson() && current + step >= list.length) return showMenu();
  if (lesson() && current + step < 0) return;
  highlight = null;
  editing = null;
  clearHint();
  legend.innerHTML = "";
  current = (current + step + list.length) % list.length;
  message.textContent = "";
  render();
}


function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}
