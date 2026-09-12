const bootScreen = document.querySelector('#bootScreen');
const desktop = document.querySelector('#desktop');
const topbar = document.querySelector('#topbar');
const defaultDesktopBackground = 'linear-gradient(135deg, #a8c7bd 0%, #c4d8be 52%, #e8e4be 100%)';
let highestZ = 20;
let dragState = null;

const defaultNotes = [
  { title: 'The quiet utility of a blank page', date: 'SEP 09 / 2026', type: 'OBSERVATION', content: '<p>A blank page is not empty. It is a room with the lights off, waiting for the first honest object.</p><blockquote>Leave a little space for the thought to arrive.</blockquote><p>That is the whole reason I keep making tools: to make room.</p>' },
  { title: 'What makes a place feel like home?', date: 'AUG 22 / 2026', type: 'QUESTION', content: '<p>Maybe it is not the furniture. Maybe it is the permission to leave something unfinished and come back to it later.</p><p>Home is an interface with a long memory.</p>' },
  { title: 'A field guide to paying attention', date: 'JUL 14 / 2026', type: 'FIELD GUIDE', content: '<p>Notice the color of the hour. Notice which idea keeps returning. Notice what becomes easier when nobody is watching.</p><blockquote>Attention is a form of affection.</blockquote>' }
];
let notes = loadNotes();
let activeNoteIndex = 0;

function loadNotes() {
  try {
    const savedNotes = JSON.parse(localStorage.getItem('lumenNotes'));
    return Array.isArray(savedNotes) && savedNotes.length ? savedNotes : defaultNotes;
  } catch (error) {
    return defaultNotes;
  }
}

function saveNotes() {
  localStorage.setItem('lumenNotes', JSON.stringify(notes));
}

function plainTextFromContent(content) {
  const temporary = document.createElement('div');
  temporary.innerHTML = content.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|blockquote|div)>/gi, '\n');
  return temporary.textContent.replace(/\n\s*\n+/g, '\n\n').trim();
}

function updateClock() {
  const now = new Date();
  document.querySelector('#timeText').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.querySelector('#dateText').textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: '2-digit' }).toUpperCase();
}

function bringToFront(element) {
  highestZ += 1;
  element.style.zIndex = highestZ;
  topbar.style.zIndex = highestZ + 1;
  document.querySelectorAll('.dock-item').forEach((item) => item.classList.remove('active'));
  const dockItem = document.querySelector(`[data-open="${element.id}"]`);
  if (dockItem) dockItem.classList.add('active');
}

function openWindow(id) {
  const element = document.getElementById(id);
  if (!element) return;
  resetTitleLetters();
  element.style.display = 'block';
  bringToFront(element);
}

function resetTitleLetters() {
  document.querySelectorAll('.title-letter.fallen').forEach((letter) => letter.classList.remove('fallen'));
}

function closeWindow(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
}

function minimizeWindow(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
}

function setDesktopBackground(background, image = '') {
  if (image) {
    desktop.style.background = 'none';
    desktop.style.backgroundImage = `url("${image.replace(/"/g, '')}")`;
    desktop.style.backgroundSize = 'cover';
    desktop.style.backgroundPosition = 'center';
    desktop.style.backgroundRepeat = 'no-repeat';
  } else {
    desktop.style.background = 'none';
    desktop.style.backgroundImage = background;
    desktop.style.backgroundSize = '';
    desktop.style.backgroundPosition = '';
    desktop.style.backgroundRepeat = '';
  }
  localStorage.setItem('lumenBackground', JSON.stringify({ background, image }));
}

function restoreDesktopBackground() {
  try {
    const saved = JSON.parse(localStorage.getItem('lumenBackground'));
    if (saved) setDesktopBackground(saved.background, saved.image);
  } catch (error) {
    localStorage.removeItem('lumenBackground');
  }
}

function returnToBootScreen() {
  document.querySelectorAll('.window').forEach((windowElement) => { windowElement.style.display = 'none'; });
  desktop.classList.add('hidden');
  bootScreen.classList.remove('hidden');
}

function renderNote(index = 0) {
  if (!notes.length) return;
  activeNoteIndex = Math.max(0, Math.min(index, notes.length - 1));
  const note = notes[activeNoteIndex];
  document.querySelector('#noteKicker').textContent = `${String(activeNoteIndex + 1).padStart(2, '0')} / ${note.type}`;
  document.querySelector('#noteTitle').value = note.title;
  document.querySelector('#noteDate').textContent = note.date;
  document.querySelector('#noteEditor').value = plainTextFromContent(note.content);
  document.querySelectorAll('.note-tab').forEach((tab, tabIndex) => tab.classList.toggle('active', tabIndex === activeNoteIndex));
}

function createNoteTabs() {
  const list = document.querySelector('#notesList');
  list.innerHTML = '';
  notes.forEach((note, index) => {
    const button = document.createElement('button');
    button.className = 'note-tab';
    button.innerHTML = `<strong>${note.title}</strong><span>${note.date}</span>`;
    button.addEventListener('click', () => renderNote(index));
    list.appendChild(button);
  });
}

function createNote() {
  notes.push({ title: 'Untitled note', date: new Date().toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(), type: 'NOTE', content: '' });
  activeNoteIndex = notes.length - 1;
  saveNotes();
  createNoteTabs();
  renderNote(activeNoteIndex);
  document.querySelector('#noteTitle').focus();
}

function saveActiveNote() {
  if (!notes.length) return;
  const title = document.querySelector('#noteTitle').value.trim() || 'Untitled note';
  const content = document.querySelector('#noteEditor').value;
  notes[activeNoteIndex] = { ...notes[activeNoteIndex], title, content };
  saveNotes();
  createNoteTabs();
  renderNote(activeNoteIndex);
}

function deleteActiveNote() {
  if (!notes.length) return;
  notes.splice(activeNoteIndex, 1);
  if (!notes.length) {
    notes.push({ title: 'Untitled note', date: new Date().toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(), type: 'NOTE', content: '' });
  }
  activeNoteIndex = Math.min(activeNoteIndex, notes.length - 1);
  saveNotes();
  createNoteTabs();
  renderNote(activeNoteIndex);
}

function setupDragging(element) {
  const handle = element.querySelector('[data-drag-handle]');
  if (!handle) return;
  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const rect = element.getBoundingClientRect();
    dragState = { element, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    bringToFront(element);
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.element !== element) return;
    const maxLeft = window.innerWidth - element.offsetWidth - 8;
    const maxTop = window.innerHeight - element.offsetHeight - 70;
    element.style.left = `${Math.max(8, Math.min(maxLeft, event.clientX - dragState.offsetX))}px`;
    element.style.top = `${Math.max(66, Math.min(maxTop, event.clientY - dragState.offsetY))}px`;
  });
  handle.addEventListener('pointerup', () => { dragState = null; });
  element.addEventListener('pointerdown', () => bringToFront(element));
}

document.querySelector('#enterButton').addEventListener('click', () => {
  bootScreen.classList.add('hidden');
  desktop.classList.remove('hidden');
  openWindow('welcomeWindow');
});

document.querySelector('#welcomeOpen').addEventListener('click', () => openWindow('welcomeWindow'));
document.querySelector('#systemOpen').addEventListener('click', () => openWindow('systemWindow'));
document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openWindow(button.dataset.open)));
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeWindow(button.dataset.close)));
document.querySelectorAll('[data-minimize]').forEach((button) => button.addEventListener('click', () => minimizeWindow(button.dataset.minimize)));
document.querySelector('#randomNote').addEventListener('click', () => renderNote(Math.floor(Math.random() * notes.length)));
document.querySelector('#newNote').addEventListener('click', createNote);
document.querySelector('#saveNote').addEventListener('click', saveActiveNote);
document.querySelector('#deleteNote').addEventListener('click', deleteActiveNote);
document.querySelector('#backgroundColor').addEventListener('input', (event) => {
  const color = event.target.value;
  document.querySelector('#backgroundColorValue').textContent = color;
  setDesktopBackground(color);
});
document.querySelector('#backgroundPreset').addEventListener('change', (event) => {
  const presets = { mint: defaultDesktopBackground, sunset: 'linear-gradient(135deg, #ffc4a3 0%, #f5d79a 48%, #d5b4a9 100%)', night: 'linear-gradient(135deg, #1d3439 0%, #314c51 50%, #685f72 100%)', plain: document.querySelector('#backgroundColor').value };
  setDesktopBackground(presets[event.target.value]);
});
document.querySelector('#applyBackground').addEventListener('click', () => {
  const image = document.querySelector('#backgroundImage').value.trim();
  if (image) setDesktopBackground(desktop.style.background || defaultDesktopBackground, image);
});
document.querySelector('#resetBackground').addEventListener('click', () => {
  document.querySelector('#backgroundImage').value = '';
  document.querySelector('#backgroundColor').value = '#a8c7bd';
  document.querySelector('#backgroundColorValue').textContent = '#a8c7bd';
  document.querySelector('#backgroundPreset').value = 'mint';
  setDesktopBackground(defaultDesktopBackground);
});
document.querySelector('#shutdownButton').addEventListener('click', returnToBootScreen);
document.querySelectorAll('.title-letter').forEach((letter) => letter.addEventListener('click', (event) => {
  event.stopPropagation();
  letter.classList.add('fallen');
}));
document.querySelectorAll('.map-pin').forEach((pin) => pin.addEventListener('click', () => {
  const place = pin.dataset.place;
  document.querySelector('#placeTitle').textContent = place;
  document.querySelector('#placeCopy').textContent = place === 'Kyoto' ? 'A lesson in making the ordinary feel ceremonial.' : place === 'Reykjavik' ? 'A reminder that quiet can have a horizon.' : 'The place where the next version starts.';
}));

createNoteTabs();
renderNote();
document.querySelectorAll('.window').forEach(setupDragging);
restoreDesktopBackground();
updateClock();
setInterval(updateClock, 1000);
