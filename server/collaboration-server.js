// server/collaboration-server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store room data
const rooms = new Map();

// Store user data
const users = new Map();

// Room class to manage room state
class Room {
  constructor(id, creator) {
    this.id = id;
    this.creator = creator;
    this.users = new Map();
    this.code = '';
    this.language = 'javascript';
    this.createdAt = new Date();
  }

  addUser(user) {
    this.users.set(user.id, user);
  }

  removeUser(userId) {
    this.users.delete(userId);
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  updateCode(code) {
    this.code = code;
  }

  updateLanguage(language) {
    this.language = language;
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room creation
  socket.on('create-room', (data) => {
    const { roomId, user, code, language } = data;
    
    try {
      // Check if room already exists
      if (rooms.has(roomId)) {
        socket.emit('error', 'Room ID already exists. Please try again.');
        return;
      }

      // Create new room
      const room = new Room(roomId, user);
      room.updateCode(code || '');
      room.updateLanguage(language || 'javascript');
      room.addUser(user);
      
      // Store room and user
      rooms.set(roomId, room);
      users.set(socket.id, { ...user, roomId });

      // Join socket room
      socket.join(roomId);

      // Send confirmation to creator
      socket.emit('room-joined', {
        roomId: roomId,
        users: room.getUsers()
      });

      console.log(`Room created: ${roomId} by ${user.name}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Failed to create room');
    }
  });

  // Handle joining existing room
  socket.on('join-room', (data) => {
    const { roomId, user } = data;
    
    try {
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      // Add user to room
      room.addUser(user);
      users.set(socket.id, { ...user, roomId });

      // Join socket room
      socket.join(roomId);

      // Send current room state to new user
      socket.emit('room-joined', {
        roomId: roomId,
        users: room.getUsers()
      });

      // Send current code and language to new user
      socket.emit('code-changed', room.code);
      socket.emit('language-changed', room.language);

      // Notify other users about new user
      socket.to(roomId).emit('user-joined', user);

      console.log(`${user.name} joined room: ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });

  // Handle leaving room
  socket.on('leave-room', (data) => {
    const { roomId, userId } = data;
    
    try {
      const room = rooms.get(roomId);
      if (room) {
        room.removeUser(userId);
        
        // If room is empty, delete it
        if (room.getUsers().length === 0) {
          rooms.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        } else {
          // Notify other users about user leaving
          socket.to(roomId).emit('user-left', userId);
        }
      }

      users.delete(socket.id);
      socket.leave(roomId);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Handle code changes
  socket.on('code-change', (data) => {
    const { roomId, code } = data;
    
    try {
      const room = rooms.get(roomId);
      if (room) {
        room.updateCode(code);
        // Broadcast to all other users in the room
        socket.to(roomId).emit('code-changed', code);
      }
    } catch (error) {
      console.error('Error handling code change:', error);
    }
  });

  // Handle language changes
  socket.on('language-change', (data) => {
    const { roomId, language } = data;
    
    try {
      const room = rooms.get(roomId);
      if (room) {
        room.updateLanguage(language);
        // Broadcast to all other users in the room
        socket.to(roomId).emit('language-changed', language);
      }
    } catch (error) {
      console.error('Error handling language change:', error);
    }
  });

  // Handle code execution
  socket.on('execute-code', (data) => {
    const { roomId } = data;
    
    try {
      // Broadcast code execution to all other users in the room
      socket.to(roomId).emit('code-executed');
      console.log(`Code executed in room: ${roomId}`);
    } catch (error) {
      console.error('Error handling code execution:', error);
    }
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    const { roomId, x, y } = data;
    
    try {
      // Broadcast cursor position to all other users in the room
      socket.to(roomId).emit('cursor-moved', {
        userId: socket.id,
        x,
        y
      });
    } catch (error) {
      console.error('Error handling cursor movement:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      const user = users.get(socket.id);
      
      if (user && user.roomId) {
        const room = rooms.get(user.roomId);
        if (room) {
          room.removeUser(socket.id);
          
          // Notify other users about disconnection
          socket.to(user.roomId).emit('user-left', socket.id);
          
          // If room is empty, delete it
          // if (room.getUsers().length === 0) {
          //   rooms.delete(user.roomId);
          //   console.log(`Room deleted: ${user.roomId}`);
          // }
        }
      }

      users.delete(socket.id);
      console.log(`User disconnected: ${socket.id}`);
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  });

  // Handle ping for connection testing
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    users: users.size,
    timestamp: new Date().toISOString()
  });
});

// Get room info endpoint
app.get('/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    res.json({
      id: room.id,
      userCount: room.getUsers().length,
      language: room.language,
      createdAt: room.createdAt
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Collaboration server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down collaboration server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});