import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { registerChatHandlers } from './modules/chat/chat.socket';

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

registerChatHandlers(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
