const socket = io();

let canvas, ctx, roomCode = null, isDrawer = false;
let currentColor = '#000000';
let brushSize = 5;

function createRoom() {
  socket.emit('createRoom');
}

function joinRoom() {
  const code = document.getElementById('roomCode').value.trim().toUpperCase();
  if (code) socket.emit('joinRoom', code);
}

socket.on('roomCreated', (code) => {
  roomCode = code;
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('roomDisplay').textContent = code;
});

socket.on('joinedRoom', (code) => {
  roomCode = code;
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('roomDisplay').textContent = code;
});

socket.on('gameStarted', (data) => {
  isDrawer = data.drawer === socket.id;
  alert(isDrawer ? `You are drawing: ${data.word}` : 'Game started! Guess in chat');
});

socket.on('timerUpdate', (time) => {
  document.getElementById('timer').textContent = time;
});

socket.on('roundEnded', (word) => {
  alert(`Round ended! The word was: ${word}`);
});

// Canvas setup
window.onload = () => {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  
  let drawing = false;

  canvas.addEventListener('mousedown', (e) => { 
    if (!isDrawer) return;
    drawing = true; 
    draw(e); 
  });
  canvas.addEventListener('mouseup', () => drawing = false);
  canvas.addEventListener('mousemove', draw);

  function draw(e) {
    if (!drawing || !isDrawer) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.fillStyle = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize/2, 0, Math.PI * 2);
    ctx.fill();

    socket.emit('draw', { room: roomCode, x, y, color: currentColor, size: brushSize });
  }

  // Color & size
  document.getElementById('color').addEventListener('input', (e) => currentColor = e.target.value);
  document.getElementById('size').addEventListener('input', (e) => brushSize = +e.target.value);

  socket.on('draw', (data) => {
    ctx.fillStyle = data.color;
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.size/2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Chat
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && roomCode) {
      socket.emit('chatMessage', { room: roomCode, player: 'You', message: chatInput.value });
      chatInput.value = '';
    }
  });

  socket.on('chatMessage', (data) => {
    const msgDiv = document.getElementById('messages');
    msgDiv.innerHTML += `<p><strong>${data.player}:</strong> ${data.message}</p>`;
    msgDiv.scrollTop = msgDiv.scrollHeight;
  });
};

function clearCanvas() {
  if (!isDrawer) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit('clearCanvas', roomCode);
}

socket.on('clearCanvas', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function startGame() {
  if (roomCode) socket.emit('startGame', roomCode);
}