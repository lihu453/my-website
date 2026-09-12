const bootScreen = document.querySelector('#bootScreen');
const desktop = document.querySelector('#desktop');
const topbar = document.querySelector('#topbar');
let highestZ = 20;
let dragState = null;

const notes = [
  { title: 'The quiet utility of a blank page', date: 'SEP 09 / 2026', type: 'OBSERVATION', content: '<p>A blank page is not empty. It is a room with the lights off, waiting for the first honest object.</p><blockquote>Leave a little space for the thought to arrive.</blockquote><p>That is the whole reason I keep making tools: to make room.</p>' },
  { title: 'What makes a place feel like home?', date: 'AUG 22 / 2026', type: 'QUESTION', content: '<p>Maybe it is not the furniture. Maybe it is the permission to leave something unfinished and come back to it later.</p><p>Home is an interface with a long memory.</p>' },
  { title: 'A field guide to paying attention', date: 'JUL 14 / 2026', type: 'FIELD GUIDE', content: '<p>Notice the color of the hour. Notice which idea keeps returning. Notice what becomes easier when nobody is watching.</p><blockquote>Attention is a form of affection.</blockquote>' }
];

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
  element.style.display = 'block';
  bringToFront(element);
}

function closeWindow(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
}

function minimizeWindow(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
}

function renderNote(index = 0) {
  const note = notes[index];
  document.querySelector('#noteKicker').textContent = `${String(index + 1).padStart(2, '0')} / ${note.type}`;
  document.querySelector('#noteTitle').textContent = note.title;
  document.querySelector('#noteDate').textContent = note.date;
  document.querySelector('#noteContent').innerHTML = note.content;
  document.querySelectorAll('.note-tab').forEach((tab, tabIndex) => tab.classList.toggle('active', tabIndex === index));
}

function createNoteTabs() {
  const list = document.querySelector('#notesList');
  notes.forEach((note, index) => {
    const button = document.createElement('button');
    button.className = 'note-tab';
    button.innerHTML = `<strong>${note.title}</strong><span>${note.date}</span>`;
    button.addEventListener('click', () => renderNote(index));
    list.appendChild(button);
  });
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
document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openWindow(button.dataset.open)));
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeWindow(button.dataset.close)));
document.querySelectorAll('[data-minimize]').forEach((button) => button.addEventListener('click', () => minimizeWindow(button.dataset.minimize)));
document.querySelector('#randomNote').addEventListener('click', () => renderNote(Math.floor(Math.random() * notes.length)));
document.querySelectorAll('.map-pin').forEach((pin) => pin.addEventListener('click', () => {
  const place = pin.dataset.place;
  document.querySelector('#placeTitle').textContent = place;
  document.querySelector('#placeCopy').textContent = place === 'Kyoto' ? 'A lesson in making the ordinary feel ceremonial.' : place === 'Reykjavik' ? 'A reminder that quiet can have a horizon.' : 'The place where the next version starts.';
}));

createNoteTabs();
renderNote();
document.querySelectorAll('.window').forEach(setupDragging);
updateClock();
setInterval(updateClock, 1000);
