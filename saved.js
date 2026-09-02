const STORAGE_KEY = "locker-notes-saved-v4";
const SECRET_PASSWORD_KEY = "locker-notes-secret-password-v1";
const savedGrid = document.getElementById("savedGrid");
const savedTotal = document.getElementById("savedTotal");
const searchNotes = document.getElementById("searchNotes");
const sortNotes = document.getElementById("sortNotes");
const kindFilter = document.getElementById("kindFilter");
const resultsHeading = document.getElementById("resultsHeading");
const clearFilters = document.getElementById("clearFilters");
const boardCount = document.getElementById("boardCount");
const cardTemplate = document.getElementById("savedCardTemplate");
const filterTabs = Array.from(document.querySelectorAll(".filter-tab"));
const noteModal = document.getElementById("noteModal");
const modalTitle = document.getElementById("modalTitle");
const modalEditor = document.getElementById("modalEditor");
const modalPaper = document.getElementById("modalPaper");
const modalColor = document.getElementById("modalColor");
const modalKind = document.getElementById("modalKind");
const closeModalButton = document.getElementById("closeModal");
const cancelModalButton = document.getElementById("cancelModal");
const updateNoteButton = document.getElementById("updateNote");
const secretModal = document.getElementById("secretModal");
const secretTitle = document.getElementById("secretTitle");
const secretMessage = document.getElementById("secretMessage");
const secretInputLabel = document.getElementById("secretInputLabel");
const secretPasswordInput = document.getElementById("secretPasswordInput");
const secretError = document.getElementById("secretError");
const secretCloseButton = document.getElementById("secretClose");
const secretCancelButton = document.getElementById("secretCancel");
const secretNewPasswordButton = document.getElementById("secretNewPassword");
const secretSubmitButton = document.getElementById("secretSubmit");

let editingNoteId = null;
let activeColorFilter = "all";
let secretMode = "setup";

const colorNames = {
  butter: "Yellow",
  sky: "Blue",
  mint: "Green",
  blush: "Pink",
  plum: "Purple",
};

const kindNames = {
  notecard: "Notecard",
  notebook: "Notebook",
  list: "List",
  scratch: "Scratch Paper",
};

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getNotes() {
  const notes = readJSON(STORAGE_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function getSecretPassword() {
  return localStorage.getItem(SECRET_PASSWORD_KEY) || "";
}

function saveSecretPassword(password) {
  localStorage.setItem(SECRET_PASSWORD_KEY, password);
}

function textFromHTML(html) {
  const node = document.createElement("div");
  node.innerHTML = html || "";
  return node.textContent.replace(/\s+/g, " ").trim();
}

function truncateText(text, maxLength = 30) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function titleFromHTML(html) {
  const node = document.createElement("div");
  node.innerHTML = html || "";
  const heading = node.querySelector("h1, h2, h3");
  const title = heading?.textContent.trim() || textFromHTML(html);
  return title ? truncateText(title) : "Untitled note";
}

function snippetFromHTML(html) {
  const text = textFromHTML(html);
  if (!text) return "Empty note";
  return truncateText(text);
}

function dateValue(note, field) {
  return Number(note[field] || note.updatedAt || note.createdAt || 0);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getFilteredNotes() {
  const query = searchNotes.value.trim().toLowerCase();
  const kind = kindFilter.value;
  const notes = getNotes().filter((note) => {
    const searchable = `${titleFromHTML(note.html)} ${textFromHTML(note.html)}`.toLowerCase();
    return (!query || searchable.includes(query)) &&
      (activeColorFilter === "all" || note.color === activeColorFilter) &&
      (kind === "all" || note.kind === kind);
  });

  return notes.sort((a, b) => {
    if (sortNotes.value === "oldest") return dateValue(a, "createdAt") - dateValue(b, "createdAt");
    if (sortNotes.value === "edited") return dateValue(b, "updatedAt") - dateValue(a, "updatedAt");
    if (sortNotes.value === "alphabetical") return titleFromHTML(a.html).localeCompare(titleFromHTML(b.html));
    return dateValue(b, "createdAt") - dateValue(a, "createdAt");
  });
}

function setResultsHeading() {
  if (searchNotes.value.trim()) {
    resultsHeading.textContent = `Results for “${searchNotes.value.trim()}”`;
    return;
  }
  resultsHeading.textContent = activeColorFilter !== "all"
    ? `${colorNames[activeColorFilter]} notes`
    : kindFilter.value !== "all"
      ? `${kindNames[kindFilter.value]} notes`
      : "All saved ideas";
}

function renderEmptyState(hasNotes) {
  savedGrid.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "saved-empty board-empty paper-card";
  empty.innerHTML = hasNotes
    ? "<strong>No notes match those filters.</strong><p>Try another color, paper style, or search word.</p>"
    : "<strong>Your locker is empty for now.</strong><p>Write something worth keeping and it will show up here.</p><a class='tool-btn primary' href='index.html#workspace'>Write a new note</a>";
  savedGrid.appendChild(empty);
  renderSecretSection();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBoardColumnCount() {
  if (window.innerWidth < 620) return 2;
  if (window.innerWidth < 980) return 2;
  return 3;
}

function sizeBoardForNotes(count) {
  const columns = getBoardColumnCount();
  const rows = Math.max(1, Math.ceil(count / columns));
  const rowHeight = window.innerWidth < 620 ? 246 : 278;
  const baseHeight = window.innerWidth < 620 ? 560 : Math.min(window.innerHeight * 0.66, 680);
  const secretShelfHeight = window.innerWidth < 620 ? 190 : 170;
  const expandedHeight = rows * rowHeight + secretShelfHeight;
  const height = Math.ceil(Math.max(baseHeight, expandedHeight));
  savedGrid.style.minHeight = `${height}px`;
  savedGrid.style.height = `${height}px`;
}

function initialPosition(index, total) {
  const columns = getBoardColumnCount();
  const column = index % columns;
  const row = Math.floor(index / columns);
  const boardHeight = parseFloat(savedGrid.style.height) || savedGrid.getBoundingClientRect().height || 680;
  const rowHeight = window.innerWidth < 620 ? 246 : 278;
  const xJitter = row % 2 === 0 ? 0.02 : 0.06;
  const yJitter = column % 2 === 0 ? 24 : 38;
  const rotationPattern = [-2, 1.5, -1, 2.2, -2.4, 1];

  return {
    x: clamp(column / columns + xJitter, 0.035, 0.74),
    y: clamp((row * rowHeight + yJitter) / boardHeight, 0.035, 0.78),
    rotation: rotationPattern[index % rotationPattern.length],
  };
}

function notePosition(note, index, total) {
  const fallback = initialPosition(index, total);
  const position = note.position || fallback;
  return {
    x: Number.isFinite(Number(position.x)) ? Number(position.x) : fallback.x,
    y: Number.isFinite(Number(position.y)) ? Number(position.y) : fallback.y,
    rotation: Number.isFinite(Number(position.rotation)) ? Number(position.rotation) : fallback.rotation,
    z: Number.isFinite(Number(position.z)) ? Number(position.z) : index + 1,
  };
}

function applyPosition(card, position) {
  card.style.left = `${position.x * 100}%`;
  card.style.top = `${position.y * 100}%`;
  card.style.zIndex = position.z;
  card.style.setProperty("--note-rotation", `${position.rotation}deg`);
}

function renderSecretSection() {
  const secretCard = document.createElement("article");
  secretCard.className = "secret-board-card";
  secretCard.setAttribute("aria-label", "Other hidden notes");
  secretCard.innerHTML = `
    <div class="secret-glass" aria-hidden="true"></div>
    <div class="secret-card-copy">
      <span class="paper-chip">Hidden notes</span>
      <h3>Other</h3>
    </div>
    <button class="load-btn secret-view-btn" type="button">View</button>
  `;
  secretCard.querySelector(".secret-view-btn").addEventListener("click", openSecretModal);
  savedGrid.appendChild(secretCard);
}

function persistPosition(note) {
  const notes = getNotes();
  const index = notes.findIndex((item) => item.id === note.id);
  if (index === -1) return;
  notes[index].position = note.position;
  saveNotes(notes);
}

function makeNoteDraggable(card, note) {
  let dragState = null;

  card.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input, select")) return;

    const boardRect = savedGrid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const highestZ = getNotes().reduce((highest, item) => Math.max(highest, Number(item.position?.z) || 0), 0);

    note.position = { ...note.position, z: highestZ + 1 };
    applyPosition(card, note.position);
    dragState = {
      pointerId: event.pointerId,
      boardRect,
      grabX: event.clientX - cardRect.left,
      grabY: event.clientY - cardRect.top,
    };
    card.classList.add("is-dragging");
    card.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const maxX = Math.max(12, dragState.boardRect.width - card.offsetWidth - 12);
    const maxY = Math.max(12, dragState.boardRect.height - card.offsetHeight - 12);
    const left = clamp(event.clientX - dragState.boardRect.left - dragState.grabX, 12, maxX);
    const top = clamp(event.clientY - dragState.boardRect.top - dragState.grabY, 12, maxY);

    note.position.x = left / dragState.boardRect.width;
    note.position.y = top / dragState.boardRect.height;
    applyPosition(card, note.position);
  });

  const finishDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    card.classList.remove("is-dragging");
    persistPosition(note);
    dragState = null;
  };

  card.addEventListener("pointerup", finishDrag);
  card.addEventListener("pointercancel", finishDrag);
  card.addEventListener("lostpointercapture", finishDrag);
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("pointercancel", finishDrag);
}

function openNoteModal(note) {
  editingNoteId = note.id;
  modalTitle.textContent = titleFromHTML(note.html);
  modalEditor.innerHTML = note.html || "";
  modalColor.value = note.color || "butter";
  modalKind.value = note.kind || "notecard";
  modalPaper.dataset.color = modalColor.value;
  modalPaper.dataset.kind = modalKind.value;
  noteModal.classList.add("open");
  noteModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => modalEditor.focus(), 60);
}

function closeNoteModal() {
  noteModal.classList.remove("open");
  noteModal.setAttribute("aria-hidden", "true");
  editingNoteId = null;
}

function updateOpenNote() {
  if (!editingNoteId) return;
  const html = modalEditor.innerHTML.trim();
  if (!modalEditor.textContent.trim()) return;

  const notes = getNotes();
  const updated = notes.map((note) => note.id === editingNoteId
    ? {
        ...note,
        html,
        color: modalColor.value,
        kind: modalKind.value,
        updatedAt: Date.now(),
      }
    : note);

  saveNotes(updated);
  closeNoteModal();
  render();
}

function scrollToSavedTop() {
  document.querySelector(".saved-page-header")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setSecretMode(mode) {
  secretMode = mode;
  secretPasswordInput.value = "";
  secretError.textContent = "";
  secretNewPasswordButton.hidden = mode !== "unlock";

  if (mode === "setup") {
    secretTitle.textContent = "Make a password";
    secretMessage.textContent = "Choose 5 numbers for this section.";
    secretInputLabel.textContent = "New 5-number password";
    secretPasswordInput.autocomplete = "new-password";
    return;
  }

  if (mode === "change-old") {
    secretTitle.textContent = "Check old password";
    secretMessage.textContent = "Enter your old 5-number password first.";
    secretInputLabel.textContent = "Old password";
    secretPasswordInput.autocomplete = "current-password";
    return;
  }

  if (mode === "change-new") {
    secretTitle.textContent = "New password";
    secretMessage.textContent = "Now choose a new 5-number password.";
    secretInputLabel.textContent = "New 5-number password";
    secretPasswordInput.autocomplete = "new-password";
    return;
  }

  secretTitle.textContent = "Enter password";
  secretMessage.textContent = "Type your 5-number password to view Other.";
  secretInputLabel.textContent = "Password";
  secretPasswordInput.autocomplete = "current-password";
}

function openSecretModal() {
  setSecretMode(getSecretPassword() ? "unlock" : "setup");
  secretModal.classList.add("open");
  secretModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => secretPasswordInput.focus(), 60);
}

function closeSecretModal() {
  secretModal.classList.remove("open");
  secretModal.setAttribute("aria-hidden", "true");
  secretError.textContent = "";
}

function requireFiveDigits(value) {
  return /^\d{5}$/.test(value);
}

function submitSecretPassword() {
  const password = secretPasswordInput.value.trim();

  if (!requireFiveDigits(password)) {
    secretError.textContent = "Use exactly 5 numbers.";
    return;
  }

  if (secretMode === "setup") {
    saveSecretPassword(password);
    closeSecretModal();
    scrollToSavedTop();
    return;
  }

  if (secretMode === "unlock") {
    if (password !== getSecretPassword()) {
      secretError.textContent = "That password is not correct.";
      return;
    }
    secretMessage.textContent = "Other is unlocked.";
    secretError.textContent = "";
    return;
  }

  if (secretMode === "change-old") {
    if (password !== getSecretPassword()) {
      secretError.textContent = "That old password is not correct.";
      return;
    }
    setSecretMode("change-new");
    return;
  }

  if (secretMode === "change-new") {
    saveSecretPassword(password);
    closeSecretModal();
    scrollToSavedTop();
  }
}

function render() {
  const allNotes = getNotes();
  const notes = getFilteredNotes();
  savedTotal.textContent = allNotes.length;
  boardCount.textContent = notes.length === allNotes.length
    ? `${notes.length} idea${notes.length === 1 ? "" : "s"} on the wall`
    : `${notes.length} of ${allNotes.length} ideas showing`;
  setResultsHeading();
  sizeBoardForNotes(notes.length);
  if (!notes.length) {
    renderEmptyState(allNotes.length > 0);
    return;
  }

  savedGrid.innerHTML = "";
  notes.forEach((note, index) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".saved-page-note");
    const title = fragment.querySelector(".saved-title");
    const preview = fragment.querySelector(".saved-preview");
    const date = fragment.querySelector(".saved-date");
    const kind = fragment.querySelector(".saved-kind");
    const color = fragment.querySelector(".saved-color-label");
    const openButton = fragment.querySelector(".load-btn");
    const removeButton = fragment.querySelector(".mini-remove");

    card.dataset.color = note.color || "butter";
    card.dataset.kind = note.kind || "notecard";
    note.position = notePosition(note, index, notes.length);
    applyPosition(card, note.position);
    title.textContent = titleFromHTML(note.html);
    preview.textContent = snippetFromHTML(note.html);
    date.textContent = formatDate(note.createdAt || note.updatedAt);
    kind.textContent = kindNames[note.kind] || "Note";
    color.textContent = colorNames[note.color] || "Yellow paper";

    openButton.addEventListener("click", () => openNoteModal(note));
    makeNoteDraggable(card, note);

    removeButton.addEventListener("click", () => {
      saveNotes(getNotes().filter((item) => item.id !== note.id));
      render();
    });

    savedGrid.appendChild(fragment);
  });
  renderSecretSection();
}

function setColorFilter(color) {
  activeColorFilter = color;
  filterTabs.forEach((tab) => tab.classList.toggle("selected", tab.dataset.color === color));
  render();
}

filterTabs.forEach((tab) => tab.addEventListener("click", () => setColorFilter(tab.dataset.color)));
searchNotes.addEventListener("input", render);
sortNotes.addEventListener("change", render);
kindFilter.addEventListener("change", render);
clearFilters.addEventListener("click", () => {
  searchNotes.value = "";
  sortNotes.value = "newest";
  kindFilter.value = "all";
  setColorFilter("all");
});

window.addEventListener("resize", render);

modalColor.addEventListener("change", () => {
  modalPaper.dataset.color = modalColor.value;
});

modalKind.addEventListener("change", () => {
  modalPaper.dataset.kind = modalKind.value;
});

closeModalButton.addEventListener("click", closeNoteModal);
cancelModalButton.addEventListener("click", closeNoteModal);
updateNoteButton.addEventListener("click", updateOpenNote);
secretCloseButton.addEventListener("click", closeSecretModal);
secretCancelButton.addEventListener("click", closeSecretModal);
secretNewPasswordButton.addEventListener("click", () => setSecretMode("change-old"));
secretSubmitButton.addEventListener("click", submitSecretPassword);

secretPasswordInput.addEventListener("input", () => {
  secretPasswordInput.value = secretPasswordInput.value.replace(/\D/g, "").slice(0, 5);
  secretError.textContent = "";
});

secretPasswordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitSecretPassword();
});

noteModal.addEventListener("click", (event) => {
  if (event.target === noteModal) closeNoteModal();
});

secretModal.addEventListener("click", (event) => {
  if (event.target === secretModal) closeSecretModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && noteModal.classList.contains("open")) closeNoteModal();
  if (event.key === "Escape" && secretModal.classList.contains("open")) closeSecretModal();
});

render();
