const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // { roomCode: { users: [], drawer: null, word: null, messages: [] } }

const words = ["apple", "house", "cat", "dog", "tree", "car", "sun", "moon", "bird", "fish"];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = { 
      users: [], 
      drawer: null, 
      word: null, 
      messages: [],
      roundTime: 60
    };
    socket.join(roomCode);
    rooms[roomCode].users.push({ id: socket.id, name: `Player${rooms[roomCode].users.length + 1}` });
    socket.emit('roomCreated', roomCode);
  });

  socket.on('joinRoom', (roomCode) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      rooms[roomCode].users.push({ id: socket.id, name: `Player${rooms[roomCode].users.length + 1}` });
      socket.emit('joinedRoom', roomCode);
      io.to(roomCode).emit('updateUsers', rooms[roomCode].users);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('startGame', (roomCode) => {
    if (!rooms[roomCode]) return;
    const room = rooms[roomCode];
    if (room.users.length < 2) return socket.emit('error', 'Need at least 2 players');

    // Choose random drawer
    const drawerIndex = Math.floor(Math.random() * room.users.length);
    room.drawer = room.users[drawerIndex].id;
    room.word = words[Math.floor(Math.random() * words.length)];

    io.to(roomCode).emit('gameStarted', {
      drawer: room.drawer,
      word: room.drawer === socket.id ? room.word : null
    });

    // Timer
    let timeLeft = room.roundTime;
    const timer = setInterval(() => {
      timeLeft--;
      io.to(roomCode).emit('timerUpdate', timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timer);
        io.to(roomCode).emit('roundEnded', room.word);
      }
    }, 1000);
  });

  socket.on('draw', (data) => {
    socket.to(data.room).emit('draw', data);
  });

  socket.on('clearCanvas', (roomCode) => {
    socket.to(roomCode).emit('clearCanvas');
  });

  socket.on('chatMessage', (data) => {
    const room = rooms[data.room];
    if (!room) return;

    const isCorrect = data.message.toLowerCase() === room.word?.toLowerCase();
    
    room.messages.push({ player: data.player, message: data.message, correct: isCorrect });
    
    io.to(data.room).emit('chatMessage', {
      player: data.player,
      message: isCorrect ? "Guessed correctly!" : data.message,
      correct: isCorrect
    });

    if (isCorrect) {
      io.to(data.room).emit('correctGuess', data.player);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up rooms (optional enhancement)
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});