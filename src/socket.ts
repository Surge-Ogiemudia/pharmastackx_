
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

// This is a custom type to add the socket to the NextApiResponse
export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

let io: SocketIOServer;

// We are using a Map to store active users and their socket IDs
const users = new Map<string, string>();

export const initSocket = (server: NetServer) => {
  io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user connects, they should emit a 'register' event with their user ID
    socket.on('register', (userId: string) => {
      console.log(`Registering user: ${userId} with socket: ${socket.id}`);
      users.set(userId, socket.id);
      socket.join(userId); // User joins a room with their own ID
    });

    socket.on('private_message', (data: { to: string; from: string; text: string }) => {
      const recipientSocketId = users.get(data.to);
      if (recipientSocketId) {
        // Send the message to both the recipient and the sender
        io.to(recipientSocketId).to(users.get(data.from)!).emit('receive_message', data);
      }
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
      // Remove the user from our map on disconnect
      for (let [userId, id] of users.entries()) {
        if (id === socket.id) {
          users.delete(userId);
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};
