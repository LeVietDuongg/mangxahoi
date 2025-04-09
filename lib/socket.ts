import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.IO client configuration for Railway
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://your-railway-app.railway.app';

let socket: any;

export const initializeSocket = (token: string) => {
  if (socket) return socket;
  
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('connect_error', (err: any) => {
    console.error('Socket connection error:', err);
  });
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
};

export const useSocket = (token: string) => {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (!token) return;
    
    const socketInstance = initializeSocket(token);
    
    const onConnect = () => {
      setIsConnected(true);
    };
    
    const onDisconnect = () => {
      setIsConnected(false);
    };
    
    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    
    // Set initial connection state
    setIsConnected(socketInstance.connected);
    
    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, [token]);
  
  return { socket, isConnected };
};

export const sendPrivateMessage = (receiverId: number, content: string) => {
  if (!socket) return false;
  
  socket.emit('private_message', {
    receiverId,
    content,
    timestamp: new Date().toISOString()
  });
  
  return true;
};

export const setTypingStatus = (receiverId: number, isTyping: boolean) => {
  if (!socket) return;
  
  socket.emit('typing', {
    receiverId,
    isTyping
  });
};

export const markMessageAsRead = (messageId: number, senderId: number) => {
  if (!socket) return;
  
  socket.emit('message_read', {
    messageId,
    senderId
  });
};

export const useSocketEvents = (events: { [key: string]: (data: any) => void }) => {
  useEffect(() => {
    if (!socket) return;
    
    // Register event listeners
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    
    // Cleanup function
    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [events, socket]);
};
