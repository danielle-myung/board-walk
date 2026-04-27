import "./style.css";

const STORAGE_KEY = "boardwalk.save.v1";
const STARTER_FISH = 5;

const fishList = [
  { id: "sunstripe-minnow", name: "Sunstripe Minnow" },
  { id: "glass-sardine", name: "Glass Sardine" },
  { id: "coral-darter", name: "Coral Darter" },
  { id: "tide-skipper", name: "Tide Skipper" },
  { id: "brass-perch", name: "Brass Perch" },
  { id: "harbor-koi", name: "Harbor Koi" },
  { id: "moonfin", name: "Moonfin" },
  { id: "reef-foxfish", name: "Reef Foxfish" },
  { id: "opal-angler", name: "Opal Angler" },
  { id: "stormray", name: "Stormray" },
  { id: "copper-marlin", name: "Copper Marlin" },
  { id: "whisper-eel", name: "Whisper Eel" },
  { id: "sapphire-grouper", name: "Sapphire Grouper" },
  { id: "ember-tuna", name: "Ember Tuna" },
  { id: "mirage-shark", name: "Mirage Shark" }
];

const levelThresholds = [
  0, 2, 5, 9, 14, 20, 27, 35, 44, 54, 65, 77, 90, 104, 119, 135, 152, 170,
  189, 209
];
const MAX_LEVEL = levelThresholds.length;

const DEFAULT_STATE = {
  version: 1,
  profile: {
    level: 1,
    pearls: 0,
    casts: 0,
    castsSpent: 0,
    streak: 0,
    bestStreak: 0,
    stepGoal: 8000,
    totalSteps: 0,
    totalMiles: 0,
    totalTreasure: 0,
    treasurePearls: 0,
    totalLogCasts: 0,
    totalLogPearls: 0,
    daysLogged: 0,
    boardwalkStage: 0,
    lastLoggedDate: "",
    unlockedCount: STARTER_FISH
  },
  entries: {},
  collection: {
    fishCounts: {},
    totalCaught: 0
  },
  lastDateOpened: ""
};

const dom = {
  screens: document.querySelectorAll(".screen"),
  navButtons: document.querySelectorAll("[data-screen-target]"),
  bottomNavButtons: document.querySelectorAll(".bottom-nav button"),
  statusLevel: document.getElementById("status-level"),
  statusPearls: document.getElementById("status-pearls"),
  statusCasts: document.getElementById("status-casts"),
  statusStreak: document.getElementById("status-streak"),
  boardwalkStage: document.getElementById("boardwalk-stage"),
  boardwalkProgress: document.getElementById("boardwalk-progress"),
  homeGoal: document.getElementById("home-goal"),
  homeLastLog: document.getElementById("home-last-log"),
  homeStreak: document.getElementById("home-streak"),
  logForm: document.getElementById("log-form"),
  logDate: document.getElementById("log-date"),
  logSteps: document.getElementById("log-steps"),
  logGoal: document.getElementById("log-goal"),
  logMiles: document.getElementById("log-miles"),
  logDuration: document.getElementById("log-duration"),
  logMessage: document.getElementById("log-message"),
  loadEntry: document.getElementById("load-entry"),
  previewCasts: document.getElementById("preview-casts"),
  previewPearls: document.getElementById("preview-pearls"),
  previewGoal: document.getElementById("preview-goal"),
  fishCasts: document.getElementById("fish-casts"),
  castButton: document.getElementById("cast-button"),
  fishMessage: document.getElementById("fish-message"),
  fishPool: document.getElementById("fish-pool"),
  historyList: document.getElementById("history-list"),
  progressLevel: document.getElementById("progress-level"),
  progressPearls: document.getElementById("progress-pearls"),
  progressStage: document.getElementById("progress-stage"),
  levelProgress: document.getElementById("level-progress"),
  progressNote: document.getElementById("progress-note"),
  collectionGrid: document.getElementById("collection-grid")
};

const state = loadState();
recomputeAll(state);
saveState(state);

initializeUI();
updateUI();

function initializeUI() {
  dom.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-screen-target");
      if (target) {
        showScreen(target);
      }
    });
  });

  dom.logForm.addEventListener("submit", handleLogSubmit);
  dom.loadEntry.addEventListener("click", handleLoadEntry);
  [dom.logDate, dom.logSteps, dom.logGoal, dom.logMiles].forEach((input) => {
    input.addEventListener("input", updateLogPreview);
  });

  dom.castButton.addEventListener("click", handleCast);

  const today = toLocalISO();
  dom.logDate.value = today;
  dom.logGoal.value = state.profile.stepGoal;
  updateLogPreview();
}

function showScreen(targetId) {
  dom.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === targetId);
  });
  dom.bottomNavButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.getAttribute("data-screen-target") === targetId
    );
  });
}

function handleLogSubmit(event) {
  event.preventDefault();
  const date = dom.logDate.value;
  const steps = toNumber(dom.logSteps.value);
  const goal = toNumber(dom.logGoal.value);
  const miles = toNumber(dom.logMiles.value);
  const duration = toNumber(dom.logDuration.value);

  if (!date) {
    setMessage(dom.logMessage, "Pick a date to log.");
    return;
  }

  if (steps < 0 || goal < 0 || miles < 0 || duration < 0) {
    setMessage(dom.logMessage, "Numbers need to be zero or higher.");
    return;
  }

  state.entries[date] = {
    date,
    steps,
    goal,
    miles,
    duration
  };

  state.profile.stepGoal = goal;
  const recomputeResult = recomputeAll(state);
  saveState(state);
  updateUI();

  const entry = state.entries[date];
  const reward = entry.rewards;
  let message = `Saved ${date}. Earned ${reward.totalCasts} casts and ${reward.totalPearls} pearls.`;
  if (recomputeResult.castsClamped) {
    message += " Casts were clamped to avoid spending more than earned.";
  }
  setMessage(dom.logMessage, message);
}

function handleLoadEntry() {
  const date = dom.logDate.value;
  if (!date) {
    setMessage(dom.logMessage, "Pick a date to load.");
    return;
  }

  const entry = state.entries[date];
  if (!entry) {
    setMessage(dom.logMessage, "No entry for that date yet.");
    return;
  }

  dom.logSteps.value = entry.steps;
  dom.logGoal.value = entry.goal;
  dom.logMiles.value = entry.miles;
  dom.logDuration.value = entry.duration;
  updateLogPreview();
  setMessage(dom.logMessage, "Loaded the saved entry.");
}

function updateLogPreview() {
  const steps = toNumber(dom.logSteps.value);
  const goal = toNumber(dom.logGoal.value);
  const miles = toNumber(dom.logMiles.value);
  const date = dom.logDate.value;

  const preview = estimateRewards(date, steps, goal, miles);
  dom.previewCasts.textContent = `${preview.casts} casts`;
  dom.previewPearls.textContent = `${preview.pearls} pearls`;
  dom.previewGoal.textContent = preview.metGoal ? "Yes" : "No";
}

function handleCast() {
  if (state.profile.casts <= 0) {
    setMessage(dom.fishMessage, "No casts available. Log a day to earn more.");
    return;
  }

  state.profile.castsSpent += 1;

  const roll = Math.random();
  if (roll < 0.01) {
    const pearls = 1 + Math.floor(Math.random() * 3);
    state.profile.treasurePearls += pearls;
    state.profile.totalTreasure += 1;
    setMessage(dom.fishMessage, `Treasure chest! +${pearls} pearls.`);
  } else {
    const unlocked = getUnlockedCount(state.profile.level);
    const fish = fishList[Math.floor(Math.random() * unlocked)];
    state.collection.fishCounts[fish.id] =
      (state.collection.fishCounts[fish.id] || 0) + 1;
    state.collection.totalCaught += 1;
    setMessage(dom.fishMessage, `You caught a ${fish.name}.`);
  }

  const recomputeResult = recomputeAll(state);
  if (recomputeResult.castsClamped) {
    setMessage(
      dom.fishMessage,
      `${dom.fishMessage.textContent} Casts were adjusted after edits.`
    );
  }
  saveState(state);
  updateUI();
}

function updateUI() {
  dom.statusLevel.textContent = state.profile.level;
  dom.statusPearls.textContent = formatNumber(state.profile.pearls);
  dom.statusCasts.textContent = formatNumber(state.profile.casts);
  dom.statusStreak.textContent = state.profile.streak;

  dom.boardwalkStage.textContent = `Stage ${state.profile.boardwalkStage + 1}`;
  document.documentElement.style.setProperty(
    "--boardwalk-stage",
    state.profile.boardwalkStage
  );

  dom.homeGoal.textContent = `${formatNumber(state.profile.stepGoal)} steps`;
  dom.homeLastLog.textContent = state.profile.lastLoggedDate || "None yet";
  const streakLabel = state.profile.lastLoggedDate
    ? `${state.profile.streak} days (as of ${state.profile.lastLoggedDate})`
    : "0 days";
  dom.homeStreak.textContent = streakLabel;

  dom.fishCasts.textContent = `${state.profile.casts} casts`;
  dom.castButton.disabled = state.profile.casts <= 0;

  renderFishPool();
  renderHistory();
  renderProgress();
  renderCollection();
}

function renderFishPool() {
  const unlocked = getUnlockedCount(state.profile.level);
  dom.fishPool.innerHTML = fishList
    .map((fish, index) => renderFishCard(fish, index < unlocked))
    .join("");
}

function renderCollection() {
  const unlocked = getUnlockedCount(state.profile.level);
  dom.collectionGrid.innerHTML = fishList
    .map((fish, index) => {
      const count = state.collection.fishCounts[fish.id] || 0;
      const locked = index >= unlocked;
      return renderFishCard(fish, !locked, count, true);
    })
    .join("");
}

function renderHistory() {
  const dates = Object.keys(state.entries).sort().reverse();
  if (dates.length === 0) {
    dom.historyList.innerHTML =
      "<div class=\"history-card\">No logs yet. Add your first day.</div>";
    return;
  }

  dom.historyList.innerHTML = dates
    .map((date) => {
      const entry = state.entries[date];
      const reward = entry.rewards || {
        totalCasts: 0,
        totalPearls: 0,
        streakAtDate: 0
      };
      const goalText = entry.metGoal ? "Goal met" : "Goal missed";
      return `
        <div class="history-card">
          <strong>${date}</strong>
          <div class="meta">
            <span>${formatNumber(entry.steps)} steps</span>
            <span>${entry.miles} miles</span>
            <span>${goalText}</span>
            <span>${reward.totalCasts} casts</span>
            <span>${reward.totalPearls} pearls</span>
            <span>Streak ${reward.streakAtDate}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderProgress() {
  dom.progressLevel.textContent = state.profile.level;
  dom.progressPearls.textContent = formatNumber(state.profile.pearls);
  dom.progressStage.textContent = `Stage ${state.profile.boardwalkStage + 1}`;

  const levelInfo = getLevelInfo(state.profile.pearls);
  if (levelInfo.atCap) {
    dom.levelProgress.style.width = "100%";
    dom.progressNote.textContent =
      "MVP cap reached. Add more levels when ready.";
  } else {
    const progress =
      (state.profile.pearls - levelInfo.currentLevelPearls) /
      (levelInfo.nextLevelPearls - levelInfo.currentLevelPearls);
    dom.levelProgress.style.width = `${Math.max(0, Math.min(progress, 1)) * 100}%`;
    dom.progressNote.textContent = `Next level at ${levelInfo.nextLevelPearls} pearls.`;
  }
}

function renderFishCard(fish, unlocked, count = 0, showCount = false) {
  const letter = fish.name[0].toUpperCase();
  const countLabel = showCount
    ? `<span class="label">Caught: ${count}</span>`
    : "";
  const statusLabel = unlocked ? fish.name : "Locked";
  return `
    <div class="fish-card ${unlocked ? "" : "locked"}">
      <div class="fish-badge">${letter}</div>
      <strong>${statusLabel}</strong>
      ${countLabel}
    </div>
  `;
}

function estimateRewards(date, steps, goal, miles) {
  const metGoal = steps >= goal && goal > 0;
  const castsFromSteps = Math.floor(steps / 1000);
  const castsFromMiles = Math.floor(miles);
  const pearlsFromGoal = metGoal ? 1 : 0;
  const pearlsFromMiles = Math.floor(miles);
  const streakBonus = estimateStreakBonus(date, metGoal);

  return {
    casts: castsFromSteps + castsFromMiles + streakBonus,
    pearls: pearlsFromGoal + pearlsFromMiles,
    metGoal
  };
}

function estimateStreakBonus(date, metGoal) {
  if (!metGoal || !date) {
    return 0;
  }
  const previousDate = shiftDate(date, -1);
  const previousEntry = state.entries[previousDate];
  const previousStreak = previousEntry?.rewards?.streakAtDate || 0;
  const streak = previousEntry?.metGoal ? previousStreak + 1 : 1;

  if (streak >= 14) {
    return 3;
  }
  if (streak >= 7) {
    return 2;
  }
  if (streak >= 3) {
    return 1;
  }
  return 0;
}

function recomputeAll(stateToUpdate) {
  const dates = Object.keys(stateToUpdate.entries).sort();
  let streak = 0;
  let bestStreak = 0;
  let totalSteps = 0;
  let totalMiles = 0;
  let totalLogCasts = 0;
  let totalLogPearls = 0;
  let previousDate = null;
  let previousMet = false;

  dates.forEach((date) => {
    const entry = stateToUpdate.entries[date];
    const steps = toNumber(entry.steps);
    const goal = toNumber(entry.goal) || stateToUpdate.profile.stepGoal;
    const miles = toNumber(entry.miles);

    const metGoal = goal > 0 && steps >= goal;
    let consecutive = false;
    if (metGoal && previousDate) {
      const diff = dayDiff(previousDate, date);
      consecutive = diff === 1 && previousMet;
    }

    if (metGoal) {
      streak = consecutive ? streak + 1 : 1;
    } else {
      streak = 0;
    }

    const castsFromSteps = Math.floor(steps / 1000);
    const castsFromMiles = Math.floor(miles);
    const pearlsFromGoal = metGoal ? 1 : 0;
    const pearlsFromMiles = Math.floor(miles);
    const streakBonus = metGoal
      ? streak >= 14
        ? 3
        : streak >= 7
          ? 2
          : streak >= 3
            ? 1
            : 0
      : 0;

    const totalCasts = castsFromSteps + castsFromMiles + streakBonus;
    const totalPearls = pearlsFromGoal + pearlsFromMiles;

    entry.steps = steps;
    entry.goal = goal;
    entry.miles = miles;
    entry.metGoal = metGoal;
    entry.rewards = {
      castsFromSteps,
      castsFromMiles,
      streakBonus,
      pearlsFromGoal,
      pearlsFromMiles,
      totalCasts,
      totalPearls,
      streakAtDate: streak
    };

    totalSteps += steps;
    totalMiles += miles;
    totalLogCasts += totalCasts;
    totalLogPearls += totalPearls;
    bestStreak = Math.max(bestStreak, streak);
    previousDate = date;
    previousMet = metGoal;
  });

  stateToUpdate.profile.totalSteps = totalSteps;
  stateToUpdate.profile.totalMiles = totalMiles;
  stateToUpdate.profile.totalLogCasts = totalLogCasts;
  stateToUpdate.profile.totalLogPearls = totalLogPearls;
  stateToUpdate.profile.daysLogged = dates.length;
  stateToUpdate.profile.bestStreak = bestStreak;
  stateToUpdate.profile.streak = streak;
  stateToUpdate.profile.lastLoggedDate = dates[dates.length - 1] || "";

  stateToUpdate.profile.pearls =
    totalLogPearls + (stateToUpdate.profile.treasurePearls || 0);

  const totalEarnedCasts = totalLogCasts;
  const originalSpent = stateToUpdate.profile.castsSpent || 0;
  const clampedSpent = Math.min(originalSpent, totalEarnedCasts);
  stateToUpdate.profile.castsSpent = clampedSpent;
  stateToUpdate.profile.casts = Math.max(0, totalEarnedCasts - clampedSpent);

  const levelInfo = getLevelInfo(stateToUpdate.profile.pearls);
  stateToUpdate.profile.level = levelInfo.level;
  stateToUpdate.profile.boardwalkStage = Math.floor((levelInfo.level - 1) / 5);
  stateToUpdate.profile.unlockedCount = getUnlockedCount(levelInfo.level);

  return {
    castsClamped: originalSpent !== clampedSpent
  };
}

function getLevelInfo(pearls) {
  let level = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i -= 1) {
    if (pearls >= levelThresholds[i]) {
      level = i + 1;
      break;
    }
  }
  const atCap = level === MAX_LEVEL;
  const currentLevelPearls = levelThresholds[level - 1];
  const nextLevelPearls = atCap
    ? levelThresholds[levelThresholds.length - 1]
    : levelThresholds[level];

  return {
    level,
    currentLevelPearls,
    nextLevelPearls,
    atCap
  };
}

function getUnlockedCount(level) {
  return Math.min(fishList.length, STARTER_FISH + (level - 1));
}

function saveState(stateToSave) {
  stateToSave.lastDateOpened = toLocalISO();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: {
        ...DEFAULT_STATE.profile,
        ...(parsed.profile || {})
      },
      entries: parsed.entries || {},
      collection: {
        ...DEFAULT_STATE.collection,
        ...(parsed.collection || {}),
        fishCounts: parsed.collection?.fishCounts || {}
      }
    };
  } catch (error) {
    return structuredClone(DEFAULT_STATE);
  }
}

function toLocalISO(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function shiftDate(dateString, deltaDays) {
  const date = parseISO(dateString);
  date.setDate(date.getDate() + deltaDays);
  return toLocalISO(date);
}

function parseISO(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayDiff(previousDate, currentDate) {
  const prev = parseISO(previousDate);
  const current = parseISO(currentDate);
  const diff = (current - prev) / 86400000;
  return Math.round(diff);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function setMessage(element, message) {
  if (!element) {
    return;
  }
  element.textContent = message;
}
