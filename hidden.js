const HIDDEN_STORAGE_KEY = "locker-notes-hidden-v1";
const HIDDEN_DRAFT_KEY = "locker-notes-hidden-draft-v1";
const SECRET_PASSWORD_KEY = "locker-notes-secret-password-v1";
const SECRET_UNLOCKED_KEY = "locker-notes-secret-unlocked-v1";
const PLACEHOLDER_TEXT = "Write your hidden idea here...";

if (!localStorage.getItem(SECRET_PASSWORD_KEY) || sessionStorage.getItem(SECRET_UNLOCKED_KEY) !== "true") {
  window.location.href = "saved.html#other";
}

const editorCard = document.getElementById("editorCard");
const editor = document.getElementById("editor");
const highlightBtn = document.getElementById("highlightBtn");
const removeBtn = document.getElementById("removeBtn");
const saveBtn = document.getElementById("saveBtn");
const saveLabel = document.getElementById("saveLabel");
const colorSwatches = Array.from(document.querySelectorAll(".paper-swatch"));
const styleChoices = Array.from(document.querySelectorAll(".style-choice"));

let activeColor = "butter";
let activeKind = "notecard";

const defaultDraft = {
  html: "",
  color: "butter",
  kind: "notecard",
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getHiddenNotes() {
  const notes = readJSON(HIDDEN_STORAGE_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

function setHiddenNotes(notes) {
  writeJSON(HIDDEN_STORAGE_KEY, notes);
}

function safeRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `hidden-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeEditorHTML(html) {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = String(html).split(PLACEHOLDER_TEXT).join("");
  const text = temp.textContent.replace(/\s+/g, " ").trim();
  if (!text || text === PLACEHOLDER_TEXT) return "";
  return temp.innerHTML.trim();
}

function getEditorHTML() {
  return sanitizeEditorHTML(editor.innerHTML.trim());
}

function saveDraft() {
  writeJSON(HIDDEN_DRAFT_KEY, {
    html: getEditorHTML(),
    color: activeColor,
    kind: activeKind,
  });
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

function restoreDraft() {
  const draft = readJSON(HIDDEN_DRAFT_KEY, defaultDraft);
  setPaperColor(draft.color || "butter", false);
  setPaperKind(draft.kind || "notecard", false);
  editor.innerHTML = sanitizeEditorHTML(draft.html || "");
}

function animatePaper() {
  editorCard.classList.remove("paper-pop");
  void editorCard.offsetWidth;
  editorCard.classList.add("paper-pop");
}

function getSelectionWithinEditor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  if (selection.isCollapsed) return null;

  return { selection, range };
}

function applyHighlight() {
  const target = getSelectionWithinEditor();
  if (!target) {
    animatePaper();
    return;
  }

  const { selection, range } = target;
  const wrapper = document.createElement("mark");
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);
  selection.removeAllRanges();
  animatePaper();
  saveDraft();
}

function clearDraft() {
  const target = getSelectionWithinEditor();
  if (target) {
    target.range.deleteContents();
  } else {
    editor.innerHTML = "";
  }
  saveDraft();
  animatePaper();
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

function saveCurrentNote() {
  const html = getEditorHTML();
  if (!html || !editor.textContent.trim()) return;

  const now = Date.now();
  const notes = getHiddenNotes();
  notes.unshift({
    id: safeRandomId(),
    color: activeColor,
    kind: activeKind,
    html,
    createdAt: now,
    updatedAt: now,
  });

  setHiddenNotes(notes);
  editor.innerHTML = "";
  localStorage.removeItem(HIDDEN_DRAFT_KEY);
  sessionStorage.setItem(SECRET_UNLOCKED_KEY, "true");
  setSaveLabel("Added!");
  animatePaper();
}

colorSwatches.forEach((button) => {
  button.addEventListener("click", () => setPaperColor(button.dataset.color));
});

styleChoices.forEach((button) => {
  button.addEventListener("click", () => setPaperKind(button.dataset.kind));
});

highlightBtn.addEventListener("click", applyHighlight);
removeBtn.addEventListener("click", clearDraft);
saveBtn.addEventListener("click", saveCurrentNote);

editor.addEventListener("input", saveDraft);
editor.addEventListener("blur", saveDraft);

editor.addEventListener("paste", (event) => {
  event.preventDefault();
  const text = event.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
  saveDraft();
});

document.querySelectorAll(".paper-swatch, .style-choice, .tool-btn").forEach((button) => {
  button.addEventListener("mousedown", () => {
    button.classList.remove("stamp");
  });
});

restoreDraft();
