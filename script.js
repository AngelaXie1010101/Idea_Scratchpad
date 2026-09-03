const editorCard = document.getElementById("editorCard");
const editor = document.getElementById("editor");
const savedDrawer = document.getElementById("savedDrawer");
const savedList = document.getElementById("savedList");
const savedNotesBtn = document.getElementById("savedNotesBtn");
const backBtn = document.getElementById("backBtn");
const palette = document.getElementById("palette");
const stylePicker = document.getElementById("stylePicker");
const highlightBtn = document.getElementById("highlightBtn");
const removeBtn = document.getElementById("removeBtn");
const saveBtn = document.getElementById("saveBtn");
const saveLabel = document.getElementById("saveLabel");
const autosaveLabel = document.getElementById("autosaveLabel");
const accountName = document.getElementById("accountName");
const accountSwitchBtn = document.getElementById("accountSwitchBtn");
const accountModal = document.getElementById("accountModal");
const accountInput = document.getElementById("accountInput");
const accountError = document.getElementById("accountError");
const accountCancelBtn = document.getElementById("accountCancelBtn");
const accountSubmitBtn = document.getElementById("accountSubmitBtn");
const guideBanner = document.getElementById("guideBanner");
const guideText = document.getElementById("guideText");
const guideNext = document.getElementById("guideNext");
const guideStep = document.getElementById("guideStep");
const savedTemplate = document.getElementById("savedNoteTemplate");
const colorSwatches = Array.from(document.querySelectorAll(".paper-swatch"));
const styleChoices = Array.from(document.querySelectorAll(".style-choice"));
const recentCount = document.getElementById("recentCount");
const streakCount = document.getElementById("streakCount");
const progressCount = document.getElementById("progressCount");
const progressDetail = document.getElementById("progressDetail");
const randomIdea = document.getElementById("randomIdea");
const sparkText = document.getElementById("sparkText");
const sideHint = document.getElementById("sideHint");
const buddyText = document.getElementById("buddyText");

const STORAGE_KEYS = {
  draft: "locker-notes-draft-v4",
  saved: "locker-notes-saved-v4",
  seenGuide: "locker-notes-guide-seen-v4",
  streak: "locker-notes-streak-v4",
};

const ACCOUNT_KEY = "locker-notes-active-account-v1";
const DEFAULT_ACCOUNT = "Guest";
const SECRET_UNLOCKED_KEY = "locker-notes-secret-unlocked-v1";

const PLACEHOLDER_TEXT = "Write your idea here...";

const guideSteps = [
  "Welcome to Locker Notes. Write fast, save the thought, and keep it in your own digital locker.",
  "Type straight into the big paper up top. That’s your main note space.",
  "Pick a paper style: notecard, notebook, list, or scratch paper.",
  "Choose a paper color to change the note itself, not just a button.",
  "Select text, then tap Highlight to call attention to it.",
  "Remove clears the current draft when you want a fresh page.",
  "Add note tucks this thought into Saved notes, then clears the page for your next idea.",
  "Tap Saved notes to open your stack, where you can sort and edit every idea you have added.",
];

const sparkPool = [
  "What song would match the mood of your day?",
  "Write one thing you wish teachers understood better.",
  "What is a tiny win from this week that still matters?",
  "What would your locker look like if it matched your brain?",
  "What could you explain for 5 minutes without notes?",
  "What’s one idea you do not want to forget before lunch?",
];

const buddyPool = [
  "Your notes are safe, even the messy ones.",
  "Tiny thoughts count too.",
  "Messy first draft, organized later.",
  "You can always come back and tidy this up.",
  "This locker keeps the good stuff.",
];

const defaultDraft = {
  html: "",
  color: "butter",
  kind: "notecard",
  savedId: null,
};

let guideIndex = 0;
let activeColor = "butter";
let activeKind = "notecard";
let currentSavedId = null;

function getActiveAccount() {
  return localStorage.getItem(ACCOUNT_KEY) || DEFAULT_ACCOUNT;
}

function accountStorageKey(key) {
  const account = getActiveAccount();
  return account === DEFAULT_ACCOUNT ? key : `${key}:${encodeURIComponent(account)}`;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(accountStorageKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(accountStorageKey(key), JSON.stringify(value));
}

function getDraft() {
  return readJSON(STORAGE_KEYS.draft, defaultDraft);
}

function setDraft(nextDraft) {
  writeJSON(STORAGE_KEYS.draft, nextDraft);
}

function getSavedNotes() {
  const notes = readJSON(STORAGE_KEYS.saved, []);
  return Array.isArray(notes) ? notes : [];
}

function setSavedNotes(notes) {
  writeJSON(STORAGE_KEYS.saved, notes);
}

function getUniqueDayCount(notes) {
  const days = new Set();
  notes.forEach((note) => {
    const timestamp = note.updatedAt || note.createdAt;
    if (!timestamp) return;
    const day = new Date(timestamp).toDateString();
    days.add(day);
  });
  return days.size;
}

function getTodayKey() {
  return new Date().toDateString();
}

function getStreak(notes) {
  const dates = Array.from(
    new Set(
      notes
        .map((note) => note.updatedAt || note.createdAt)
        .filter(Boolean)
        .map((timestamp) => new Date(timestamp).toDateString())
    )
  ).sort((a, b) => new Date(a) - new Date(b));

  if (!dates.length) return 0;

  let streak = 1;
  let current = new Date(dates[dates.length - 1]);

  for (let i = dates.length - 2; i >= 0; i -= 1) {
    const previous = new Date(dates[i]);
    const diffDays = Math.round((current - previous) / 86400000);
    if (diffDays === 1) {
      streak += 1;
      current = previous;
    } else if (diffDays > 1) {
      break;
    }
  }

  return streak;
}

function getSelectionWithinEditor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  if (selection.isCollapsed) return null;

  return { selection, range };
}

function safeRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSaveLabel(tempText) {
  saveLabel.textContent = tempText;
  saveBtn.classList.add("stamp");
  window.clearTimeout(setSaveLabel._timer);
  setSaveLabel._timer = window.setTimeout(() => {
    saveLabel.textContent = "Add note";
    saveBtn.classList.remove("stamp");
  }, 900);
}

function setBuddyMessage(message) {
  buddyText.textContent = message;
}

function setSparkMessage() {
  const seed = new Date().getDate() % sparkPool.length;
  const message = sparkPool[seed];
  sparkText.textContent = message;
  randomIdea.textContent = message;
}

function renderAccount() {
  accountName.textContent = getActiveAccount();
}

function openAccountModal() {
  accountInput.value = "";
  accountError.textContent = "";
  accountModal.classList.add("open");
  accountModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => accountInput.focus(), 60);
}

function closeAccountModal() {
  accountModal.classList.remove("open");
  accountModal.setAttribute("aria-hidden", "true");
  accountError.textContent = "";
}

function refreshForAccount() {
  currentSavedId = null;
  restoreDraft();
  renderSavedNotes();
  setSideMetrics();
  renderAccount();
}

function signOut() {
  sessionStorage.removeItem(accountStorageKey(SECRET_UNLOCKED_KEY));
  localStorage.removeItem(ACCOUNT_KEY);
  refreshForAccount();
  openAccountModal();
}

function signIn() {
  const nextAccount = accountInput.value.replace(/\s+/g, " ").trim();
  if (!nextAccount) {
    accountError.textContent = "Type an account name.";
    return;
  }

  localStorage.setItem(ACCOUNT_KEY, nextAccount);
  closeAccountModal();
  refreshForAccount();
  setBuddyMessage(`Signed in as ${nextAccount}.`);
}

function setSideMetrics() {
  const notes = getSavedNotes();
  recentCount.textContent = `${notes.length}`;
  progressCount.textContent = `${notes.length} notes`;
  progressDetail.textContent = `${notes.filter((note) => (note.updatedAt || note.createdAt || 0)).length} notes stored in your locker.`;
  streakCount.textContent = `${getStreak(notes)} day${getStreak(notes) === 1 ? "" : "s"}`;
  sideHint.textContent = notes.length ? "Tap Saved notes to revisit an old idea." : "Tap Add note to tuck a thought into your locker.";
}

function escapeHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div;
}

function snippetFromHTML(html) {
  const temp = escapeHTML(html);
  const text = temp.textContent.replace(/\s+/g, " ").trim();
  if (!text) return "Empty note";
  return text.length > 30 ? `${text.slice(0, 30)}...` : text;
}

function titleFromHTML(html) {
  const temp = escapeHTML(html);
  const heading = temp.querySelector("h1, h2, h3");
  if (heading && heading.textContent.trim()) {
    const headingText = heading.textContent.trim();
    return headingText.length > 30 ? `${headingText.slice(0, 30)}...` : headingText;
  }
  const firstText = snippetFromHTML(html);
  return firstText;
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function setPaperColor(color, persist = true) {
  activeColor = color;
  editorCard.dataset.color = color;
  colorSwatches.forEach((button) => {
    button.classList.toggle("selected", button.dataset.color === color);
  });
  animatePaper();
  if (persist) saveDraft();
}

function setPaperKind(kind, persist = true) {
  activeKind = kind;
  editorCard.dataset.kind = kind;
  styleChoices.forEach((button) => {
    button.classList.toggle("selected", button.dataset.kind === kind);
  });
  animatePaper();
  if (persist) saveDraft();
}

function animatePaper() {
  editorCard.classList.remove("paper-pop");
  void editorCard.offsetWidth;
  editorCard.classList.add("paper-pop");
}

function setEditorHTML(html) {
  editor.innerHTML = html || "";
}

function getEditorHTML() {
  const html = editor.innerHTML.trim();
  return sanitizeEditorHTML(html);
}

function sanitizeEditorHTML(html) {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = String(html).split(PLACEHOLDER_TEXT).join("");
  const text = temp.textContent.replace(/\s+/g, " ").trim();
  if (!text || text === PLACEHOLDER_TEXT) return "";
  return temp.innerHTML.trim();
}

function saveDraft() {
  setDraft({
    html: getEditorHTML(),
    color: activeColor,
    kind: activeKind,
    savedId: currentSavedId,
  });
}

function restoreDraft() {
  const draft = getDraft();
  activeColor = draft.color || "butter";
  activeKind = draft.kind || "notecard";
  currentSavedId = draft.savedId || null;
  setPaperColor(activeColor, false);
  setPaperKind(activeKind, false);
  setEditorHTML(sanitizeEditorHTML(draft.html || ""));
}

function applyWrap(tagName, className) {
  const target = getSelectionWithinEditor();
  if (!target) {
    animatePaper();
    return;
  }

  const { selection, range } = target;
  const wrapper = document.createElement(tagName);
  if (className) wrapper.className = className;
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);
  selection.removeAllRanges();
  animatePaper();
  saveDraft();
}

function unwrapSelection() {
  const target = getSelectionWithinEditor();
  if (target) {
    const { range } = target;
    range.deleteContents();
    animatePaper();
    saveDraft();
    return;
  }

  editor.innerHTML = "<p></p>";
  currentSavedId = null;
    setSaveLabel("Add note");
  setBuddyMessage("Fresh page. New thought?");
  saveDraft();
  animatePaper();
}

function loadSavedNote(note) {
  currentSavedId = note.id;
  setPaperColor(note.color || "butter", false);
  setPaperKind(note.kind || "notecard", false);
  setEditorHTML(sanitizeEditorHTML(note.html || ""));
  saveDraft();
  setBuddyMessage("Nice. That one's back on your desk.");
}

function renderSavedNotes() {
  const notes = getSavedNotes();
  savedList.innerHTML = "";

  if (!notes.length) {
    const empty = document.createElement("div");
    empty.className = "paper-card saved-note";
    empty.style.padding = "16px";
    empty.innerHTML = "<p class='saved-preview'>Your locker is looking pretty empty. Add your first note and it will show up here.</p>";
    savedList.appendChild(empty);
    return;
  }

  notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((note) => {
      const fragment = savedTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".saved-note");
      const title = fragment.querySelector(".saved-title");
      const preview = fragment.querySelector(".saved-preview");
      const date = fragment.querySelector(".saved-date");
      const loadBtn = fragment.querySelector(".load-btn");
      const removeMiniBtn = fragment.querySelector(".mini-remove");

      card.dataset.id = note.id;
      card.dataset.color = note.color || "butter";
      title.textContent = titleFromHTML(note.html);
      preview.textContent = snippetFromHTML(note.html);
      date.textContent = formatDate(note.updatedAt || note.createdAt || Date.now());

      loadBtn.addEventListener("click", () => {
        loadSavedNote(note);
        openSavedDrawer(false);
      });

      removeMiniBtn.addEventListener("click", () => {
        const filtered = getSavedNotes().filter((item) => item.id !== note.id);
        setSavedNotes(filtered);
        if (currentSavedId === note.id) currentSavedId = null;
        renderSavedNotes();
        setSideMetrics();
        saveDraft();
      });

      savedList.appendChild(fragment);
    });
}

function saveCurrentNote() {
  const html = getEditorHTML();
  if (!html || !editor.textContent.trim()) return;

  const now = Date.now();
  const notes = getSavedNotes();
  const id = safeRandomId();

  const nextNote = {
    id,
    color: activeColor,
    kind: activeKind,
    html,
    createdAt: now,
    updatedAt: now,
  };

  notes.unshift(nextNote);
  setSavedNotes(notes);
  currentSavedId = null;
  setEditorHTML("");
  renderSavedNotes();
  setSideMetrics();
  setSaveLabel("Added!");
  setBuddyMessage("Added to the locker. Ready for the next thought?");
  animatePaper();
  saveDraft();
}

function openSavedDrawer(announce = true) {
  savedDrawer.classList.add("open");
  savedDrawer.setAttribute("aria-hidden", "false");
  if (announce) setBuddyMessage("Saved stack open. Pick a note or go back.");
}

function closeSavedDrawer() {
  savedDrawer.classList.remove("open");
  savedDrawer.setAttribute("aria-hidden", "true");
  setBuddyMessage("Back to writing.");
}

function applyGuideStep() {
  const step = guideSteps[guideIndex];
  guideText.textContent = step;
  guideStep.textContent = `${guideIndex + 1} / ${guideSteps.length}`;
  guideNext.textContent = guideIndex === guideSteps.length - 1 ? "Done" : "Next";
  document.querySelectorAll(".pulse").forEach((node) => node.classList.remove("pulse"));

  const focusMap = [
    editorCard,
    editor,
    stylePicker,
    palette,
    highlightBtn,
    removeBtn,
    saveBtn,
    savedNotesBtn,
  ];
  const target = focusMap[guideIndex];
  if (target) target.classList.add("pulse");
}

guideNext.addEventListener("click", () => {
  if (guideIndex < guideSteps.length - 1) {
    guideIndex += 1;
    applyGuideStep();
  } else {
    guideBanner.classList.add("hide");
    localStorage.setItem(STORAGE_KEYS.seenGuide, "true");
  }
});

accountSwitchBtn.addEventListener("click", signOut);
accountCancelBtn.addEventListener("click", closeAccountModal);
accountSubmitBtn.addEventListener("click", signIn);

accountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") signIn();
});

accountModal.addEventListener("click", (event) => {
  if (event.target === accountModal) closeAccountModal();
});

savedNotesBtn.addEventListener("click", () => {
  window.location.href = "saved.html";
});
backBtn.addEventListener("click", closeSavedDrawer);

colorSwatches.forEach((button) => {
  button.addEventListener("click", () => setPaperColor(button.dataset.color));
});

styleChoices.forEach((button) => {
  button.addEventListener("click", () => setPaperKind(button.dataset.kind));
});

highlightBtn.addEventListener("click", () => applyWrap("mark"));
removeBtn.addEventListener("click", unwrapSelection);
saveBtn.addEventListener("click", saveCurrentNote);

editor.addEventListener("input", saveDraft);
editor.addEventListener("blur", saveDraft);

editor.addEventListener("paste", (event) => {
  event.preventDefault();
  const text = event.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
  saveDraft();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accountModal.classList.contains("open")) {
    closeAccountModal();
  }

  if (event.key === "Escape" && savedDrawer.classList.contains("open")) {
    closeSavedDrawer();
  }
});

document.querySelectorAll(".paper-swatch, .style-choice, .tool-btn, .guide-next, .saved-trigger, .back-btn, .load-btn, .mini-remove, .account-switch").forEach((button) => {
  button.addEventListener("mousedown", () => {
    button.classList.remove("stamp");
  });
});

renderAccount();
restoreDraft();
renderSavedNotes();
setSideMetrics();
setSparkMessage();

const seenGuide = localStorage.getItem(STORAGE_KEYS.seenGuide);
if (seenGuide === "true") {
  guideBanner.classList.add("hide");
} else {
  applyGuideStep();
}
