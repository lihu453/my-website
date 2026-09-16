const bootScreen = document.querySelector('#bootScreen');
const desktop = document.querySelector('#desktop');
const topbar = document.querySelector('#topbar');
const defaultDesktopBackground = 'linear-gradient(135deg, #a8c7bd 0%, #c4d8be 52%, #e8e4be 100%)';
let highestZ = 20;
let dragState = null;
let resizeState = null;
let browserHistory = ['https://example.com'];
let browserHistoryIndex = 0;

const defaultNotes = [
  { title: 'The quiet utility of a blank page', date: 'SEP 09 / 2026', type: 'OBSERVATION', content: '<p>A blank page is not empty. It is a room with the lights off, waiting for the first honest object.</p><blockquote>Leave a little space for the thought to arrive.</blockquote><p>That is the whole reason I keep making tools: to make room.</p>' },
  { title: 'What makes a place feel like home?', date: 'AUG 22 / 2026', type: 'QUESTION', content: '<p>Maybe it is not the furniture. Maybe it is the permission to leave something unfinished and come back to it later.</p><p>Home is an interface with a long memory.</p>' },
  { title: 'A field guide to paying attention', date: 'JUL 14 / 2026', type: 'FIELD GUIDE', content: '<p>Notice the color of the hour. Notice which idea keeps returning. Notice what becomes easier when nobody is watching.</p><blockquote>Attention is a form of affection.</blockquote>' }
];
let notes = loadNotes();
let activeNoteIndex = 0;
let files = loadFiles();
let activeFileId = null;
let pendingMedia = null;

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
  if (id === 'gamesWindow' && game.state === 'paused') setGameMessage('Paused. Press jump to continue.');
}

function resetTitleLetters() {
  document.querySelectorAll('.title-letter.fallen').forEach((letter) => letter.classList.remove('fallen'));
}

function closeWindow(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
  if (id === 'gamesWindow') pauseGame();
}

function minimizeWindow(id) {
  const element = document.getElementById(id);
  if (element) element.style.display = 'none';
  if (id === 'gamesWindow') pauseGame();
}

function saveWindowBounds(element) {
  if (element.dataset.savedBounds) return;
  element.dataset.savedBounds = JSON.stringify({
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  });
}

function restoreWindowBounds(element) {
  if (!element.dataset.savedBounds) return;
  const bounds = JSON.parse(element.dataset.savedBounds);
  Object.entries(bounds).forEach(([property, value]) => { element.style[property] = value; });
  delete element.dataset.savedBounds;
}

function toggleMaximize(id) {
  const element = document.getElementById(id);
  if (!element) return;
  bringToFront(element);
  if (element.classList.contains('maximized')) {
    element.classList.remove('maximized');
    restoreWindowBounds(element);
  } else {
    saveWindowBounds(element);
    element.classList.remove('fullscreen');
    element.classList.add('maximized');
  }
}

function toggleFullscreen(id) {
  const element = document.getElementById(id);
  if (!element) return;
  bringToFront(element);
  if (element.classList.contains('fullscreen')) {
    element.classList.remove('fullscreen');
    restoreWindowBounds(element);
  } else {
    saveWindowBounds(element);
    element.classList.remove('maximized');
    element.classList.add('fullscreen');
  }
}

const game = {
  state: 'ready',
  animationId: null,
  lastTime: 0,
  elapsedTime: 0,
  score: 0,
  best: loadGameBest(),
  speed: 260,
  spawnTimer: 1.1,
  player: { x: 92, y: 207, width: 29, height: 38, velocityY: 0 },
  obstacles: []
};

function loadGameBest() {
  try {
    const savedBest = Number(localStorage.getItem('lumenGameBest'));
    return Number.isFinite(savedBest) && savedBest > 0 ? Math.floor(savedBest) : 0;
  } catch (error) {
    return 0;
  }
}

function setGameMessage(message) {
  const messageElement = document.querySelector('#gameMessage');
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.classList.toggle('hidden', !message);
  }
}

function updateGameScore() {
  document.querySelector('#gameScore').textContent = String(Math.floor(game.score)).padStart(5, '0');
  document.querySelector('#gameBest').textContent = String(game.best).padStart(5, '0');
}

function resetGame(showMessage = true) {
  game.state = 'ready';
  game.elapsedTime = 0;
  game.score = 0;
  game.speed = 260;
  game.spawnTimer = 1.1;
  game.player.y = 207;
  game.player.velocityY = 0;
  game.obstacles = [];
  if (game.animationId) cancelAnimationFrame(game.animationId);
  game.animationId = null;
  updateGameScore();
  drawGame();
  setGameMessage(showMessage ? 'Press start or jump to begin.' : '');
}

function startGame() {
  if (game.state === 'running') return;
  if (game.state === 'gameOver') resetGame(false);
  game.state = 'running';
  game.lastTime = performance.now();
  setGameMessage('');
  document.querySelector('#gameCanvas').focus();
  game.animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (game.state !== 'running') return;
  game.state = 'paused';
  if (game.animationId) cancelAnimationFrame(game.animationId);
  game.animationId = null;
  setGameMessage('Paused. Press jump to continue.');
}

function jumpGame() {
  if (game.state === 'ready' || game.state === 'paused') startGame();
  if (game.state !== 'running') return;
  const groundY = 245 - game.player.height;
  if (game.player.y >= groundY - 1) game.player.velocityY = -610;
}

function endGame() {
  game.state = 'gameOver';
  if (game.animationId) cancelAnimationFrame(game.animationId);
  game.animationId = null;
  const finalScore = Math.floor(game.score);
  if (finalScore > game.best) {
    game.best = finalScore;
    try { localStorage.setItem('lumenGameBest', String(game.best)); } catch (error) { }
  }
  updateGameScore();
  setGameMessage('Run ended. Press restart to try again.');
  drawGame();
}

function spawnGameObstacle() {
  const types = [
    { name: 'spike', width: 22, height: 34 },
    { name: 'block', width: 32, height: 27 },
    { name: 'tower', width: 23, height: 55 },
    { name: 'wide', width: 54, height: 25 }
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  const height = type.height + (type.name === 'tower' ? Math.random() * 10 : Math.random() * 8);
  const width = type.width + (type.name === 'wide' ? Math.random() * 10 : Math.random() * 5);
  game.obstacles.push({ name: type.name, x: 780, y: 245 - height, width, height });
  if (type.name === 'spike' && Math.random() > 0.55) {
    game.obstacles.push({ name: 'spike', x: 780 + width + 10, y: 211, width: 18, height: 34 });
  }
}

function intersects(first, second) {
  const padding = 5;
  return first.x + padding < second.x + second.width && first.x + first.width - padding > second.x && first.y + padding < second.y + second.height && first.y + first.height - padding > second.y;
}

function updateGame(delta) {
  const groundY = 245 - game.player.height;
  game.elapsedTime += delta;
  game.score += delta * 10;
  game.speed = Math.min(260 + game.elapsedTime * 10, 680);
  game.player.velocityY += 1500 * delta;
  game.player.y = Math.min(groundY, game.player.y + game.player.velocityY * delta);
  game.spawnTimer -= delta;
  if (game.spawnTimer <= 0) {
    spawnGameObstacle();
    game.spawnTimer = Math.max(0.62, 1.45 - game.elapsedTime / 70) + Math.random() * 0.5;
  }
  game.obstacles.forEach((obstacle) => { obstacle.x -= game.speed * delta; });
  game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);
  if (game.obstacles.some((obstacle) => intersects(game.player, obstacle))) endGame();
  updateGameScore();
}

function drawGame() {
  const canvas = document.querySelector('#gameCanvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f4f2e9';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(27,41,39,.09)';
  context.lineWidth = 1;
  for (let x = 20; x < canvas.width; x += 38) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  context.strokeStyle = '#1b2927';
  context.beginPath();
  context.moveTo(0, 245.5);
  context.lineTo(canvas.width, 245.5);
  context.stroke();
  const player = game.player;
  context.fillStyle = '#1b2927';
  context.fillRect(player.x + 7, player.y + 8, 18, 25);
  context.fillRect(player.x + 13, player.y + 2, 12, 10);
  context.fillRect(player.x + 24, player.y + 7, 8, 4);
  context.fillRect(player.x + 2, player.y + 14, 7, 6);
  context.fillRect(player.x + 9, player.y + 32, 5, 6);
  context.fillRect(player.x + 21, player.y + 32, 5, 6);
  context.fillStyle = '#d8ff62';
  context.fillRect(player.x + 21, player.y + 5, 3, 3);
  game.obstacles.forEach((obstacle) => {
    context.fillStyle = '#ff8066';
    context.fillStyle = '#1b2927';
    if (obstacle.name === 'spike') {
      context.beginPath();
      context.moveTo(obstacle.x, 245);
      context.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
      context.lineTo(obstacle.x + obstacle.width, 245);
      context.closePath();
      context.fill();
      context.fillStyle = '#ff8066';
      context.fillRect(obstacle.x + obstacle.width / 2 - 2, obstacle.y + 10, 4, 4);
    } else if (obstacle.name === 'wide') {
      context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      context.fillStyle = '#ff8066';
      context.fillRect(obstacle.x + 7, obstacle.y + 7, obstacle.width - 14, 3);
    } else {
      context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      context.fillStyle = '#ff8066';
      context.fillRect(obstacle.x + 6, obstacle.y + 7, 4, 4);
      if (obstacle.name === 'tower') context.fillRect(obstacle.x + obstacle.width - 10, obstacle.y + 19, 4, 4);
    }
  });
}

function gameLoop(timestamp) {
  if (game.state !== 'running') return;
  const delta = Math.min((timestamp - game.lastTime) / 1000, 0.05);
  game.lastTime = timestamp;
  updateGame(delta);
  drawGame();
  if (game.state === 'running') game.animationId = requestAnimationFrame(gameLoop);
}

function initGame() {
  document.querySelector('#gameStart').addEventListener('click', startGame);
  document.querySelector('#gamePause').addEventListener('click', pauseGame);
  document.querySelector('#gameReset').addEventListener('click', () => resetGame());
  document.querySelector('#gameJump').addEventListener('click', jumpGame);
  document.querySelector('#gameCanvas').addEventListener('pointerdown', jumpGame);
  window.addEventListener('keydown', (event) => {
    const target = event.target;
    const gamesWindow = document.querySelector('#gamesWindow');
    if (gamesWindow.style.display === 'none' || target.matches('input, textarea, select, button')) return;
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      jumpGame();
    }
    if (event.code === 'KeyP') pauseGame();
  });
  resetGame();
}

function initCursorTrail() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let lastX = -100;
  let lastY = -100;
  let lastTime = 0;

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const now = performance.now();
    const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
    if (now - lastTime < 35 || distance < 14) return;
    lastX = event.clientX;
    lastY = event.clientY;
    lastTime = now;

    const block = document.createElement('span');
    block.className = 'cursor-trail-block';
    block.style.left = `${event.clientX}px`;
    block.style.top = `${event.clientY}px`;
    document.body.appendChild(block);
    window.setTimeout(() => block.remove(), 520);
  });
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

function loadFiles() {
  try {
    const savedFiles = JSON.parse(localStorage.getItem('lumenFiles'));
    return Array.isArray(savedFiles) ? savedFiles.filter((file) => file && file.id && file.name && typeof file.content === 'string') : [];
  } catch (error) {
    return [];
  }
}

function saveFiles() {
  try {
    localStorage.setItem('lumenFiles', JSON.stringify(files));
    return true;
  } catch (error) {
    setFilesStatus('Could not save this file. Browser storage may be full.', true);
    return false;
  }
}

function setFilesStatus(message = '', isError = false) {
  const status = document.querySelector('#filesStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function formatFileSize(bytes) {
  if (!bytes) return 'empty';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
}

function fileTypeLabel(type) {
  return type === 'image' ? 'IMAGE' : type === 'video' ? 'VIDEO' : 'TEXT';
}

function renderFiles() {
  const list = document.querySelector('#filesList');
  const empty = document.querySelector('#filesEmpty');
  const count = document.querySelector('#fileCount');
  if (!list || !empty || !count) return;
  const sortedFiles = [...files].sort((first, second) => second.updatedAt - first.updatedAt);
  list.innerHTML = '';
  count.textContent = `${String(files.length).padStart(2, '0')} ${files.length === 1 ? 'file' : 'files'}`;
  empty.classList.toggle('hidden', files.length > 0);
  sortedFiles.forEach((file) => {
    const button = document.createElement('button');
    button.className = `file-item${file.id === activeFileId ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.fileId = file.id;
    button.innerHTML = `<span class="file-icon ${file.type}-file-icon">${file.type === 'text' ? 'TXT' : file.type === 'image' ? 'IMG' : 'VID'}</span><span class="file-item-copy"><strong></strong><small>${fileTypeLabel(file.type)} / ${formatFileSize(file.size)}</small></span>`;
    button.querySelector('strong').textContent = file.name;
    list.appendChild(button);
  });
}

function clearFileDetail() {
  activeFileId = null;
  document.querySelector('#fileDetailEmpty').classList.remove('hidden');
  document.querySelector('#filePreview').classList.add('hidden');
  document.querySelector('#filePreview').innerHTML = '';
  renderFiles();
}

function openFile(fileId) {
  const file = files.find((item) => item.id === fileId);
  if (!file) return;
  activeFileId = file.id;
  const empty = document.querySelector('#fileDetailEmpty');
  const preview = document.querySelector('#filePreview');
  empty.classList.add('hidden');
  preview.classList.remove('hidden');
  const safeName = document.createElement('span');
  safeName.textContent = file.name;
  if (file.type === 'text') {
    preview.innerHTML = `<div class="file-preview-heading"><div><p class="eyebrow">TEXT FILE</p><h4></h4></div><button class="mini-action delete-file" type="button">delete</button></div><textarea class="file-open-editor" aria-label="File content"></textarea><div class="file-preview-actions"><button class="mini-action save-open-file" type="button">save changes</button></div>`;
    preview.querySelector('h4').appendChild(safeName);
    preview.querySelector('.file-open-editor').value = file.content.replace(/^data:text\/plain;base64,/, '');
  } else {
    preview.innerHTML = `<div class="file-preview-heading"><div><p class="eyebrow">${fileTypeLabel(file.type)} FILE</p><h4></h4></div><button class="mini-action delete-file" type="button">delete</button></div>`;
    preview.querySelector('h4').appendChild(safeName);
    const media = document.createElement(file.type === 'image' ? 'img' : 'video');
    media.className = 'file-media';
    media.src = file.content;
    media.alt = file.name;
    if (file.type === 'video') {
      media.controls = true;
      media.preload = 'metadata';
    }
    preview.appendChild(media);
  }
  renderFiles();
}

function showFileForm() {
  pendingMedia = null;
  const form = document.querySelector('#fileForm');
  form.reset();
  document.querySelector('#fileName').value = 'untitled.txt';
  document.querySelector('#fileType').value = 'text';
  updateFileFormType();
  form.classList.remove('hidden');
  document.querySelector('#fileName').focus();
}

function updateFileFormType() {
  const isText = document.querySelector('#fileType').value === 'text';
  document.querySelector('#fileUploadLabel').classList.toggle('hidden', isText);
  document.querySelector('#fileContentLabel').classList.toggle('hidden', !isText);
  if (!isText) document.querySelector('#fileUpload').value = '';
}

function closeFileForm() {
  pendingMedia = null;
  document.querySelector('#fileForm').classList.add('hidden');
}

function createFile(event) {
  event.preventDefault();
  const type = document.querySelector('#fileType').value;
  const name = document.querySelector('#fileName').value.trim() || `untitled.${type === 'text' ? 'txt' : type}`;
  let content = document.querySelector('#fileContent').value;
  let mime = 'text/plain';
  let size = new Blob([content]).size;
  if (type !== 'text') {
    if (!pendingMedia) {
      setFilesStatus('Choose an image or video before saving.', true);
      return;
    }
    content = pendingMedia.content;
    mime = pendingMedia.mime;
    size = pendingMedia.size;
  }
  const newFile = { id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, type, mime, content, size, updatedAt: Date.now() };
  files.push(newFile);
  if (!saveFiles()) {
    files.pop();
    return;
  }
  closeFileForm();
  setFilesStatus(`${name} saved.`);
  openFile(newFile.id);
}

function readMediaFile(file) {
  if (!file || !['image/', 'video/'].some((prefix) => file.type.startsWith(prefix))) {
    setFilesStatus('Please choose an image or video file.', true);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    pendingMedia = { content: reader.result, mime: file.type, size: file.size };
    setFilesStatus(`${file.name} ready to save.`);
  });
  reader.addEventListener('error', () => setFilesStatus('Could not read that media file.', true));
  reader.readAsDataURL(file);
}

function deleteFile() {
  const file = files.find((item) => item.id === activeFileId);
  if (!file) return;
  files = files.filter((item) => item.id !== activeFileId);
  if (!saveFiles()) {
    files.push(file);
    return;
  }
  clearFileDetail();
  setFilesStatus(`${file.name} deleted.`);
}

function saveOpenTextFile() {
  const file = files.find((item) => item.id === activeFileId);
  const editor = document.querySelector('.file-open-editor');
  if (!file || !editor) return;
  const previousContent = file.content;
  file.content = editor.value;
  file.size = new Blob([file.content]).size;
  file.updatedAt = Date.now();
  if (!saveFiles()) {
    file.content = previousContent;
    return;
  }
  setFilesStatus(`${file.name} updated.`);
  renderFiles();
}

function initFiles() {
  renderFiles();
  document.querySelector('#newFile').addEventListener('click', showFileForm);
  document.querySelector('#cancelFile').addEventListener('click', closeFileForm);
  document.querySelector('#refreshFiles').addEventListener('click', () => { files = loadFiles(); renderFiles(); setFilesStatus('File list refreshed.'); });
  document.querySelector('#fileType').addEventListener('change', updateFileFormType);
  document.querySelector('#fileUpload').addEventListener('change', (event) => readMediaFile(event.target.files[0]));
  document.querySelector('#fileForm').addEventListener('submit', createFile);
  document.querySelector('#filesList').addEventListener('click', (event) => {
    const item = event.target.closest('[data-file-id]');
    if (item) openFile(item.dataset.fileId);
  });
  document.querySelector('#filePreview').addEventListener('click', (event) => {
    if (event.target.closest('.delete-file')) deleteFile();
    if (event.target.closest('.save-open-file')) saveOpenTextFile();
  });
}

function normalizeBrowserUrl(value) {
  const candidate = value.trim().match(/^https?:\/\//i) ? value.trim() : `https://${value.trim()}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
  return url.href;
}

function updateBrowserHistoryButtons() {
  document.querySelector('#browserBack').disabled = browserHistoryIndex === 0;
  document.querySelector('#browserForward').disabled = browserHistoryIndex === browserHistory.length - 1;
}

function navigateBrowser(value, addToHistory = true) {
  let url;
  try {
    url = normalizeBrowserUrl(value);
  } catch (error) {
    document.querySelector('#browserStatus').textContent = 'enter a valid http or https address';
    return;
  }
  if (addToHistory) {
    browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
    if (browserHistory[browserHistory.length - 1] !== url) browserHistory.push(url);
    browserHistoryIndex = browserHistory.length - 1;
  }
  document.querySelector('#browserAddress').value = url;
  document.querySelector('#browserStatus').innerHTML = '<span class="status-dot"></span> loading';
  document.querySelector('#browserFrame').src = url;
  updateBrowserHistoryButtons();
}

function setupDragging(element) {
  const handle = element.querySelector('[data-drag-handle]');
  if (!handle) return;
  const resizeMargin = 9;

  function getResizeEdges(event) {
    const rect = element.getBoundingClientRect();
    const nearLeft = event.clientX - rect.left <= resizeMargin;
    const nearRight = rect.right - event.clientX <= resizeMargin;
    const nearTop = event.clientY - rect.top <= resizeMargin;
    const nearBottom = rect.bottom - event.clientY <= resizeMargin;
    return { left: nearLeft, right: nearRight, top: nearTop, bottom: nearBottom };
  }

  function updateResizeCursor(event) {
    if (resizeState && resizeState.element === element) return;
    if (element.classList.contains('maximized') || element.classList.contains('fullscreen')) {
      element.style.cursor = '';
      return;
    }
    const edges = getResizeEdges(event);
    const horizontal = edges.left || edges.right;
    const vertical = edges.top || edges.bottom;
    element.style.cursor = horizontal && vertical ? (edges.left === edges.top ? 'nwse-resize' : 'nesw-resize') : horizontal ? 'ew-resize' : vertical ? 'ns-resize' : '';
  }

  element.addEventListener('pointermove', (event) => {
    if (!resizeState || resizeState.element !== element) {
      updateResizeCursor(event);
      return;
    }
    const { startX, startY, startWidth, startHeight, startLeft, startTop, edges } = resizeState;
    const minWidth = Math.min(280, window.innerWidth - 32);
    const minHeight = 180;
    let width = startWidth;
    let height = startHeight;
    let left = startLeft;
    let top = startTop;
    if (edges.right) width = Math.max(minWidth, startWidth + event.clientX - startX);
    if (edges.bottom) height = Math.max(minHeight, startHeight + event.clientY - startY);
    if (edges.left) {
      left = Math.min(startLeft + startWidth - minWidth, event.clientX);
      width = Math.max(minWidth, startWidth + startLeft - left);
    }
    if (edges.top) {
      top = Math.min(startTop + startHeight - minHeight, event.clientY);
      height = Math.max(minHeight, startHeight + startTop - top);
    }
    const maxRight = window.innerWidth - 8;
    const maxBottom = window.innerHeight - 70;
    if (left < 8) { width -= 8 - left; left = 8; }
    if (top < 66) { height -= 66 - top; top = 66; }
    if (left + width > maxRight) width = maxRight - left;
    if (top + height > maxBottom) height = maxBottom - top;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${Math.max(minWidth, width)}px`;
    element.style.height = `${Math.max(minHeight, height)}px`;
  });

  element.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, input, textarea, select') || element.classList.contains('maximized') || element.classList.contains('fullscreen')) return;
    const edges = getResizeEdges(event);
    if (!edges.left && !edges.right && !edges.top && !edges.bottom) return;
    const rect = element.getBoundingClientRect();
    resizeState = { element, startX: event.clientX, startY: event.clientY, startWidth: rect.width, startHeight: rect.height, startLeft: rect.left, startTop: rect.top, edges };
    bringToFront(element);
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  function stopResizing() {
    if (resizeState && resizeState.element === element) resizeState = null;
  }

  element.addEventListener('pointerup', stopResizing);
  element.addEventListener('pointercancel', stopResizing);
  element.addEventListener('lostpointercapture', stopResizing);
  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    if (getResizeEdges(event).left || getResizeEdges(event).right || getResizeEdges(event).top || getResizeEdges(event).bottom) return;
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
});


document.querySelector('#systemOpen').addEventListener('click', () => openWindow('systemWindow'));
document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openWindow(button.dataset.open)));
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeWindow(button.dataset.close)));
document.querySelectorAll('[data-minimize]').forEach((button) => button.addEventListener('click', () => minimizeWindow(button.dataset.minimize)));
document.querySelectorAll('[data-maximize]').forEach((button) => button.addEventListener('click', () => toggleMaximize(button.dataset.maximize)));
document.querySelectorAll('[data-fullscreen]').forEach((button) => button.addEventListener('click', () => toggleFullscreen(button.dataset.fullscreen)));
document.querySelector('#browserForm').addEventListener('submit', (event) => {
  event.preventDefault();
  navigateBrowser(document.querySelector('#browserAddress').value);
});
document.querySelector('#browserBack').addEventListener('click', () => {
  if (browserHistoryIndex > 0) {
    browserHistoryIndex -= 1;
    navigateBrowser(browserHistory[browserHistoryIndex], false);
  }
});
document.querySelector('#browserForward').addEventListener('click', () => {
  if (browserHistoryIndex < browserHistory.length - 1) {
    browserHistoryIndex += 1;
    navigateBrowser(browserHistory[browserHistoryIndex], false);
  }
});
document.querySelector('#browserReload').addEventListener('click', () => {
  const frame = document.querySelector('#browserFrame');
  frame.src = frame.src;
});
document.querySelector('#browserExternal').addEventListener('click', () => {
  try {
    window.open(normalizeBrowserUrl(document.querySelector('#browserAddress').value), '_blank', 'noopener');
  } catch (error) {
    document.querySelector('#browserStatus').textContent = 'enter a valid http or https address';
  }
});
document.querySelector('#browserFrame').addEventListener('load', () => {
  document.querySelector('#browserStatus').innerHTML = '<span class="status-dot"></span> page loaded';
});
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
initFiles();
initGame();
initCursorTrail();
document.querySelectorAll('.window').forEach(setupDragging);
updateBrowserHistoryButtons();
restoreDesktopBackground();
updateClock();
setInterval(updateClock, 1000);
