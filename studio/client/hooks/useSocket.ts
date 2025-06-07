import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    // Create socket connection
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔗 Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description || 'No description',
        context: error.context || 'No context',
        type: error.type || 'Unknown type'
      });
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      socket.disconnect();
    };
  }, []);

  const emit = (event: string, data?: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
  };
} 