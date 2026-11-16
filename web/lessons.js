// The "How to play" lessons: the guide cat and its speech bubble, lesson 4's tour of the buttons,
// and solving a lesson (lessons check themselves, no Submit).


let lastSaid = "";   // what the guide said last time, so it only hops when that changes
let guidePoints = new Set();   // cats the guide points at ("start with Ash"), they pulse like a hint
let guidePoint = null;         // the tour step whose button (pen, ✓ or Hint) the guide points at

// the guide above a lesson's grid: a tuxedo cat (a coat no puzzle cat has) with a speech bubble
// that holds the title, what to do, the tools to try, and feedback on your marks
function renderLesson() {
  const l = lesson();
  guidePoints = new Set();
  guidePoint = null;
  hintButton.classList.remove("point");
  document.body.classList.toggle("in-lesson", l !== null);
  hintButton.textContent = l?.steps ? "Next step" : "Hint";
  lessonBox.hidden = l === null;
  if (!l) return;
  const s = state();

  lessonBox.innerHTML = "";
  const guide = document.createElement("img");
  guide.className = "guide";
  guide.src = `sprites/cat_tuxedo_${s.solved ? "happy" : "neutral"}.png`;   // happy once the lesson is solved
  guide.alt = "";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  lessonBox.append(guide, bubble);

  const title = document.createElement("h2");
  title.textContent = l.title;
  const intro = document.createElement("p");
  intro.textContent = l.intro;
  // the ending (and the last lesson's "something doesn't add up") take the intro's place, so the bubble needs less room
  const allMarked = s.marks.every(mark => mark !== "unknown");
  intro.hidden = s.solved || (l.steps !== undefined && allMarked);
  bubble.append(title, intro);

  // why a mark is wrong (lessons 1 to 4 explain it), the tour step you're on, or the lesson's ending once it's solved
  const feedback = document.createElement("p");
  feedback.className = "lesson-feedback";
  if (s.solved) {
    feedback.classList.add("solved");
    feedback.append(l.done, " ", nextButton(current === list.length - 1));
  } else {
    const p = puzzle();
    const right = cat => s.marks[cat] === (p.liars[cat] ? "liar" : "honest");
    // the cats this one's answer builds on (lesson.after) that aren't solved yet
    const unsolved = cat => (l.after?.[cat] ?? []).filter(c => !right(c));
    // a wrong mark you can already fix, then a mark (right or wrong) made before the cats it builds on
    const wrong = s.marks.findIndex((mark, i) => mark !== "unknown" && !right(i) && !unsolved(i).length);
    const early = s.marks.findIndex((mark, i) => mark !== "unknown" && unsolved(i).length);
    // a cat that's ready now: the cats it builds on are solved and it has no mark yet (lesson.next)
    const ready = Object.keys(l.next ?? {}).map(Number).find(cat => s.marks[cat] === "unknown" && !unsolved(cat).length);
    if (l.steps) {
      // the last lesson is a real puzzle: no word on single marks (that would let you guess your way through),
      // only once every cat is marked and something is off. Next step then finds the first mark that's off.
      if (allMarked) feedback.textContent = l.off;
    } else if (wrong !== -1) {
      feedback.classList.add("wrong");
      feedback.textContent = l.why?.[wrong] ?? `${p.cats[wrong].name}'s mark is wrong. Look at the clues again.`;
    } else if (early !== -1) {
      const first = unsolved(early);
      const names = first.map(cat => p.cats[cat].name).join(" and ");
      feedback.classList.add("wrong");
      feedback.textContent = `Start with ${names} first: ${p.cats[early].name}'s answer comes from ${names}'s clue.`;
      guidePoints = new Set(first);   // and those cats pulse
    } else if (ready !== undefined) {
      feedback.textContent = l.next[ready];
      guidePoints = new Set([ready]);
    } else if (tourStep(l, s)) {
      const step = tourStep(l, s);
      feedback.textContent = tourText(stepText(step));
      // the hint step points at Hint until it has shown the cat it finds
      guidePoint = step.point === "hint" && hintFound.size ? null : step;
      if (step.point === "card") guidePoints = new Set([step.cat]);
    }
  }
  hintButton.classList.toggle("point", guidePoint?.point === "hint");
  bubble.append(feedback);
  keepTallest(bubble, intro, feedback, l);

  // the cat hops when it says something new (a new lesson, a why line, the ending), not on every tap
  // (the guide and bubble are new elements on every render, so only the new ones get the animation class)
  const said = `${current} ${bubble.textContent}`;
  if (said !== lastSaid) {
    guide.classList.add("hop");
    bubble.classList.add("pop");
  }
  lastSaid = said;
}


// lesson 4's tour: the first step you haven't done yet. A step stays done once you've done it,
// and steps you do early count too, so the guide just skips them when it gets there.
function tourStep(l, s) {
  if (!l.tour) return null;
  l.tour.forEach(step => { if (stepDone(step, s)) s.tour[step.id] = true; });
  return l.tour.find(step => !s.tour[step.id]) ?? null;
}


function stepDone(step, s) {
  const done = step.done ?? {};   // the last step has none: it ends when the lesson is solved
  if ("note" in done) return s.notes[done.note].trim() !== "" && editing !== done.note;   // written and closed
  if ("connections" in done) return highlight === done.connections;
  if ("mark" in done) return s.marks[done.mark[0]] === done.mark[1];
  if ("used" in done) return s.used[done.used];
  return false;
}


// the hint step has three texts: before Hint, after one press, and after the second press shows the cat
function stepText(step) {
  if (step.point !== "hint") return step.text;
  if (hintFound.size) return step.found;
  return hintCards.size ? step.again : step.text;
}


// "{press}" in a tour text: right click on a computer, long-press on a phone
function tourText(text) {
  return text.replace("{press}", matchMedia("(hover: none)").matches ? "Long-press" : "Right click");
}


// The bubble starts as tall as it will ever get in this lesson, so the cards under it never move:
// it tries every feedback this lesson can show (each why line, the ending) and keeps the tallest height.
// This all happens before the browser draws, so you never see the tries.
function keepTallest(bubble, intro, feedback, l) {
  const real = [...feedback.childNodes];
  const realIntro = intro.hidden;
  const longestName = puzzle().cats.map(cat => cat.name).sort((a, b) => b.length - a.length)[0];
  const cats = puzzle().cats;
  const options = [
    ...Object.values(l.why ?? {}).map(text => [text]),
    ...Object.values(l.next ?? {}).map(text => [text]),
    ...(l.tour ?? []).flatMap(step => [step.text, step.again, step.found]).filter(Boolean).map(text => [tourText(text)]),
    ...Object.entries(l.after ?? {}).map(([cat, first]) => {
      const names = first.map(c => cats[c].name).join(" and ");
      return [`Start with ${names} first: ${cats[cat].name}'s answer comes from ${names}'s clue.`];
    }),
    // the last lesson never says a single mark is wrong (it has l.off instead, see below)
    ...(l.steps ? [] : [[`${longestName}'s mark is wrong. Look at the clues again.`]]),
  ];
  // these show in place of the intro: the ending with a real button ("Back to the menu" is the longer one), and l.off
  const instead = [[l.done, " ", nextButton(true)], ...(l.off ? [[l.off]] : [])];
  let tallest = 0;
  for (const [hidden, group] of [[false, [[], ...options]], [true, instead]]) {
    intro.hidden = hidden;
    for (const nodes of group) {
      feedback.replaceChildren(...nodes);
      tallest = Math.max(tallest, bubble.offsetHeight);
    }
  }
  intro.hidden = realIntro;
  feedback.replaceChildren(...real);
  bubble.style.minHeight = tallest + "px";
}


// the button after a solved lesson: on to the next one, or back to the menu after the last
function nextButton(last) {
  const button = document.createElement("button");
  button.textContent = !last ? "Next lesson →" : DAILY_MODE ? "On to today's puzzles →" : "Back to the menu";
  button.addEventListener("click", () => last ? showMenu() : go(1));
  return button;
}


// in a lesson, the puzzle is solved as soon as every mark is right (no Check needed)
function checkLesson() {
  const p = puzzle();
  const s = state();
  if (!lesson() || s.solved || s.revealed) return;
  if (s.marks.every((mark, i) => (mark === "liar") === p.liars[i] && mark !== "unknown")) {
    s.solved = true;
    if (FEEDBACK && lastLesson()) s.cardOpen = !s.sent;   // feedback set: rate the tutorial
  }
}


// true in the tutorial's last lesson (the feedback set asks about the tutorial there)
function lastLesson() {
  return lesson() !== null && list[current] === FIRST_LESSON + LESSON_LIST.length - 1;
}
