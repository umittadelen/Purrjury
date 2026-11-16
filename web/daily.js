// The daily page: dates, loading a month's puzzles, the home screen, the streak, the # addresses (Back button),
// the solved card, Share and past days.


// --- Daily ---
// export.py --daily makes one 3x3 and one 4x4 per date, a file per month (daily/2026-11.js sets DAILY["2026-11"]).
// days.js says which days exist (DAILY_FIRST to DAILY_LAST). The day flips at the player's own midnight.

const DAILY_SIZES = ["3x3", "4x4"];
const dayOf = {};          // dayOf[i]: the date of daily puzzle i ("2026-11-13")
const dayIndexes = {};     // dayIndexes["2026-11-13"]: [3x3 index, 4x4 index] into ALL_PUZZLES
let homeDay = null;        // the day the home screen shows, to notice midnight
let pastMonth = null;      // the month past days shows ("2026-11")
let pastPicked = null;     // the day tapped in past days
let copied = false;        // the Share button says "Copied!" for a moment

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function todayKey() { return dateKey(new Date()); }
// "2026-11-13" -> a Date at local noon (noon, so a clock change can't push it into the day before)
function parseDay(day) { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d, 12); }
function addDays(day, n) { const date = parseDay(day); date.setDate(date.getDate() + n); return dateKey(date); }
function dayLabel(day) { return parseDay(day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
function dailyExists(day) {
  return typeof DAILY_FIRST !== "undefined" && day >= DAILY_FIRST && day <= DAILY_LAST && day <= todayKey();
}

// load a month's file (if it isn't loaded yet), then call back. A missing file just leaves the month empty.
function loadMonth(month, callback) {
  if (typeof DAILY === "undefined" || DAILY[month]) return callback();
  const script = document.createElement("script");
  script.src = `daily/${month}.js?v=${typeof VERSION !== "undefined" ? VERSION : Date.now()}`;
  script.onload = script.onerror = () => callback();
  document.head.append(script);
}

// a day's two puzzles as indexes into ALL_PUZZLES, added on first use (with their saved progress), or null
function dayPuzzles(day) {
  if (dayIndexes[day]) return dayIndexes[day];
  const puzzles = typeof DAILY !== "undefined" && DAILY[day.slice(0, 7)]?.[day];
  if (!puzzles) return null;
  const saved = savedProgress();
  dayIndexes[day] = puzzles.map(p => {
    const i = ALL_PUZZLES.push(p) - 1;
    states.push(freshState(p));
    ids[i] = `daily-${day}-${sizeOf(p)}`;
    dayOf[i] = day;
    loadState(i, saved);
    return i;
  });
  return dayIndexes[day];
}

// what you did on a day's puzzle of a size, from the loaded state or else from what's saved (other months)
function dailyRecord(day, size, saved) {
  const i = dayIndexes[day]?.[DAILY_SIZES.indexOf(size)];
  return i !== undefined ? states[i] : saved[`daily-${day}-${size}`] ?? null;
}

// days in a row you played on the day itself, up to today (or up to yesterday, while today isn't played yet).
// Anything counts: a mark or a hint is enough.
function streak() {
  const saved = savedProgress();
  const playedOnDay = day => DAILY_SIZES.some(size => dailyRecord(day, size, saved)?.playedOn === day);
  let day = playedOnDay(todayKey()) ? todayKey() : addDays(todayKey(), -1);
  let count = 0;
  while (playedOnDay(day)) { count++; day = addDays(day, -1); }
  return count;
}

// play a day: its 3x3 first, or `size` if given
function playDay(day, size) {
  loadMonth(day.slice(0, 7), () => {
    const indexes = dayPuzzles(day);
    if (!indexes) return;
    start(indexes, size ? indexes[DAILY_SIZES.indexOf(size)] : undefined);
  });
}


// Every daily screen has its own address after the #, so the browser's Back button goes back a screen
// instead of leaving the site: none for home, #how-to-play, #past/2026-11 and #2026-11-13/3x3.
// (A # address because GitHub Pages only serves files that exist: reloading /2026-11-13/3x3 would be a 404.)
// history.state.depth counts the screens since home, so Home steps back to it instead of piling up history.

function goTo(address, replace = false) {
  const depth = address ? (history.state?.depth ?? 0) + (replace ? 0 : 1) : 0;
  const url = address ? "#" + address : location.pathname + location.search;
  if (replace) history.replaceState({ depth }, "", url);
  else history.pushState({ depth }, "", url);
  route();
}

function goHome() {
  const depth = history.state?.depth ?? 0;
  if (depth > 0) history.go(-depth);   // back to home's own entry; popstate then calls route
  else goTo("", true);
}

// show the screen the address asks for
function route() {
  leaveScreen();
  const address = decodeURIComponent(location.hash.slice(1));
  const puzzleAddress = address.match(/^(\d{4}-\d{2}-\d{2})\/(\d+x\d+)$/);
  if (address === "how-to-play") return openTutorial();
  if (address.startsWith("past")) {
    const month = /^past\/\d{4}-\d{2}$/.test(address) ? address.slice(5) : todayKey().slice(0, 7);
    return loadMonth(month, () => showPast(month));
  }
  if (puzzleAddress && dailyExists(puzzleAddress[1])) return playDay(puzzleAddress[1], puzzleAddress[2]);
  showHome();
}

// tidy up the screen you're leaving: a solved puzzle's card sends its time, hints and notes close
function leaveScreen() {
  if (!game.hidden && dayOf[list[current]] && state().cardOpen) {
    sendDaily(list[current]);
    state().cardOpen = false;
  }
  highlight = null;
  clearTimeout(highlightTimer);
  clearHint();
  legend.innerHTML = "";
  editing = null;
  message.textContent = "";
}


// the home screen: the date and your streak, a tile per puzzle, and the countdown to the next ones
function showHome() {
  game.hidden = true;
  menu.hidden = true;
  past.hidden = true;
  home.hidden = false;
  ratingBox.hidden = true;
  document.body.classList.remove("playing");
  renderHome();
}

function renderHome() {
  const today = todayKey();
  homeDay = today;
  const days = streak();
  document.getElementById("home-date").textContent = dayLabel(today) + (days ? ` · 🔥 ${days} day${days === 1 ? "" : "s"} in a row` : "");
  const tiles = document.getElementById("tiles");
  tiles.innerHTML = "";
  const indexes = dailyExists(today) ? dayPuzzles(today) : null;
  if (!indexes) {
    tiles.textContent = "No puzzles today. Come back soon!";
  } else {
    DAILY_SIZES.forEach((size, k) => tiles.append(puzzleTile(`Today's ${size}`, states[indexes[k]], () => goTo(`${today}/${size}`))));
  }
  updateCountdown();
}

// one tile: its name, and solved (with the time), going (time so far) or not started
function puzzleTile(title, s, onClick) {
  const tile = document.createElement("button");
  tile.className = "tile" + (s.solved ? " done" : "");
  const name = document.createElement("b");
  name.textContent = title;
  const time = document.createElement("span");
  time.className = "tile-time";
  time.textContent = s.solved ? `✓ ${formatTime(s.seconds)}` : s.seconds ? `${formatTime(s.seconds)} so far` : "";
  const status = document.createElement("span");
  status.className = "tile-status";
  status.textContent = s.solved ? (s.hints ? `Solved · ${s.hints} hint${s.hints === 1 ? "" : "s"}` : "Solved") : s.moves || s.hints ? "Continue" : "Play";
  tile.append(name, time, status);
  tile.addEventListener("click", onClick);
  return tile;
}

// "New puzzles in 10h 48m". Runs every second while home is up (see the timer at the bottom).
// When midnight comes the home screen shows the new day.
function updateCountdown() {
  if (todayKey() !== homeDay) return renderHome();
  const midnight = parseDay(addDays(todayKey(), 1));
  midnight.setHours(0, 0, 0, 0);
  const minutes = Math.ceil((midnight - new Date()) / 60000);
  const text = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  document.getElementById("countdown").textContent = `New puzzles in ${text}`;
}


// the card once a daily puzzle is solved: time, streak, two rows of paws, a comment, Send, Share and on to the next one.
// It goes to the sheet with Send, or with whatever is filled in when you leave the card (leaveCard).
function renderDailyCard() {
  stopButton.hidden = true;
  const s = state();
  ratingBox.hidden = !s.cardOpen;
  if (!s.cardOpen) return;
  ratingBox.innerHTML = "";
  const i = list[current];
  const day = dayOf[i];

  const title = document.createElement("h3");
  title.textContent = `Solved in ${formatTime(s.seconds)}! 🐾`;
  const line = document.createElement("p");
  line.className = "rating-help";
  const days = streak();
  line.textContent = `${s.hints} hint${s.hints === 1 ? "" : "s"}` + (days ? ` · 🔥 ${days} day${days === 1 ? "" : "s"} in a row` : "");
  ratingBox.append(title, line);

  if (!s.sent) {
    const help = document.createElement("p");
    help.className = "rating-help";
    help.textContent = "How was it? More paws = harder, or more fun.";
    const comment = document.createElement("textarea");
    comment.rows = 2;
    comment.placeholder = "Anything to add? (optional)";
    comment.value = s.comment;
    comment.addEventListener("input", () => { s.comment = comment.value; });   // no render, it would lose the cursor
    ratingBox.append(help, pawRow("Hard", "hard"), pawRow("Fun", "fun"), comment);
  }
  const rated = s.hard || s.fun || s.comment.trim();
  const status = document.createElement("p");
  status.className = s.error ? "rating-error" : "rating-help";
  status.textContent = s.error || (s.sending ? "Sending…" : s.sent && rated ? "Thanks for rating! 🐾" : "");
  if (status.textContent) ratingBox.append(status);

  const buttons = document.createElement("div");
  buttons.className = "rating-buttons";
  // Send while it isn't sent (leaving the card sends it too, so Send is only the clear way to finish)
  if (!s.sent) {
    const send = ratingButton(s.sending ? "Sending…" : "Send", () => sendDaily(i), true);
    send.disabled = s.sending;
    buttons.append(send);
  }
  buttons.append(ratingButton(copied ? "Copied!" : "Share", () => share(day)));
  buttons.append(ratingButton("See the board", () => leaveCard(render)));
  // on to the other puzzle of the day if it isn't solved yet, else back home (the main button once it's sent)
  const other = dayIndexes[day].find(j => j !== i && !states[j].solved);
  if (other !== undefined) {
    buttons.append(ratingButton(`Play the ${sizeOf(ALL_PUZZLES[other])} →`, () => leaveCard(() => { current = list.indexOf(other); render(); }), s.sent));
  } else {
    buttons.append(ratingButton("Home", () => leaveCard(goHome), s.sent));
  }
  ratingBox.append(buttons);
}

// close the card (sending the time if the paws weren't picked), then go on
function leaveCard(then) {
  const i = list[current];
  if (!states[i].sent && !states[i].sending) sendDaily(i);
  states[i].cardOpen = false;
  message.textContent = "";
  then();
}

// one sheet row for a solved daily puzzle: the time, hints and checks, and the paws if picked
function sendDaily(i) {
  const s = states[i];
  if (s.sent || s.sending || !s.solved) return;
  const msg = { ...sheetRow(i, "solved"), hard: s.hard || "", fun: s.fun || "", comment: s.comment.trim() };
  post(msg, s, () => { if (!game.hidden && list[current] === i) renderRating(); else saveProgress(); });
}

// copy the day's result, to paste in a group chat
function share(day) {
  const saved = savedProgress();
  const parts = DAILY_SIZES.map(size => {
    const r = dailyRecord(day, size, saved);
    return `${size} ${r?.solved ? formatTime(r.seconds) : "–"}`;
  });
  const hints = DAILY_SIZES.reduce((sum, size) => sum + (dailyRecord(day, size, saved)?.hints ?? 0), 0);
  const days = day === todayKey() ? streak() : 0;
  const text = [`Purrjury ${dayLabel(day)} 🐾`, parts.join(" · "),
    `${hints} hint${hints === 1 ? "" : "s"}` + (days ? ` · 🔥 ${days}` : ""), location.href.split(/[?#]/)[0]].join("\n");
  const done = () => { copied = true; renderRating(); setTimeout(() => { copied = false; if (!game.hidden) renderRating(); }, 1500); };
  // phones get their share menu, computers copy it
  if (navigator.share && matchMedia("(pointer: coarse)").matches) navigator.share({ text }).catch(() => {});
  else navigator.clipboard?.writeText(text).then(done, () => {});
}


// past days: a month calendar from the first day to today. Green: both solved, yellow: played.
function showPast(month) {
  home.hidden = true;
  game.hidden = true;
  past.hidden = false;
  pastMonth = month ?? pastMonth ?? todayKey().slice(0, 7);
  renderPast();
}

function renderPast() {
  const saved = savedProgress();
  const first = parseDay(pastMonth + "-01");
  document.getElementById("past-month").textContent = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const firstMonth = typeof DAILY_FIRST !== "undefined" ? DAILY_FIRST.slice(0, 7) : pastMonth;
  document.getElementById("past-prev").disabled = pastMonth <= firstMonth;
  document.getElementById("past-next").disabled = pastMonth >= todayKey().slice(0, 7);

  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";
  for (const name of ["M", "T", "W", "T", "F", "S", "S"]) {
    const head = document.createElement("span");
    head.className = "weekday";
    head.textContent = name;
    calendar.append(head);
  }
  // empty slots before the 1st (Monday first)
  for (let k = 0; k < (first.getDay() + 6) % 7; k++) calendar.append(document.createElement("span"));
  for (const date = new Date(first); date.getMonth() === first.getMonth(); date.setDate(date.getDate() + 1)) {
    const day = dateKey(date);
    const cell = document.createElement("button");
    cell.className = "day";
    cell.textContent = date.getDate();
    const records = DAILY_SIZES.map(size => dailyRecord(day, size, saved));
    if (records.every(r => r?.solved)) cell.classList.add("both");
    else if (records.some(r => r?.solved || r?.moves || r?.hints)) cell.classList.add("some");
    if (day === todayKey()) cell.classList.add("today");
    if (day === pastPicked) cell.classList.add("picked");
    if (dailyExists(day)) cell.addEventListener("click", () => { pastPicked = day; renderPast(); });
    else cell.disabled = true;
    calendar.append(cell);
  }

  // the tapped day: your times, and its two puzzles to play
  const box = document.getElementById("past-day");
  box.innerHTML = "";
  if (!pastPicked || pastPicked.slice(0, 7) !== pastMonth) return;
  const title = document.createElement("b");
  title.textContent = dayLabel(pastPicked);
  const tiles = document.createElement("div");
  tiles.className = "past-tiles";
  DAILY_SIZES.forEach(size => {
    const r = dailyRecord(pastPicked, size, saved) ?? { solved: false, seconds: 0, hints: 0, moves: 0 };
    tiles.append(puzzleTile(size, r, () => goTo(`${pastPicked}/${size}`)));
  });
  box.append(title, tiles);
}
