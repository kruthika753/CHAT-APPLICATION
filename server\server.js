const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});

const history = {};

io.on('connection', (socket) => {
  console.log('user connected', socket.id);

  socket.on('join', ({ room, nick }, cb) => {
    socket.join(room);
    socket.data.nick = nick || 'Anonymous';
    socket.data.room = room;

    const roomHistory = history[room] || [];
    socket.emit('history', roomHistory);

    socket.to(room).emit('system', `${socket.data.nick} joined the room.`);
    cb && cb({ ok: true, historyLength: roomHistory.length });
  });

  socket.on('message', (payload, cb) => {
    const room = socket.data.room;
    const msg = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2,8),
      nick: socket.data.nick || 'Anonymous',
      text: payload.text,
      ts: new Date().toISOString()
    };

    history[room] = history[room] || [];
    history[room].push(msg);
    if (history[room].length > 200) history[room].shift();

    io.to(room).emit('message', msg);
    cb && cb({ ok: true });
  });

  socket.on('typing', (isTyping) => {
    const room = socket.data.room;
    socket.to(room).emit('typing', { nick: socket.data.nick, typing: isTyping });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    const nick = socket.data.nick;
    if (room) socket.to(room).emit('system', `${nick} left the room.`);
    console.log('user disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
