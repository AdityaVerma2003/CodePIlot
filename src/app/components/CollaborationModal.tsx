'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Users, Copy, X, Share2, UserPlus, Wifi, WifiOff } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  avatar: string;
  cursor: { x: number; y: number };
  isActive: boolean;
}

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  onRunCode: () => void;
}

export default function CollaborationModal({
  isOpen,
  onClose,
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onRunCode
}: CollaborationModalProps) {
  const [roomId, setRoomId] = useState<string>('');
  const [joinRoomId, setJoinRoomId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const socketRef = useRef<Socket | null>(null);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateUserProfile = (id: string): User => {
    const names = ['Alex', 'Sarah', 'Mike', 'Emma', 'John', 'Lisa', 'David', 'Anna'];
    const avatars = ['👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🎓', '👩‍🎓', '🧑‍🎓', '👨‍🔬', '👩‍🔬'];

    return {
      id,
      name: names[Math.floor(Math.random() * names.length)],
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      cursor: { x: 0, y: 0 },
      isActive: true
    };
  };

  const initializeSocket = () => {
    if (socketRef.current) return;

    setConnectionStatus('connecting');

    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionStatus('connected');

      const user = generateUserProfile(socket.id!);
      setCurrentUser(user);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setUsers([]);
    });

    socket.on('room-joined', (data: { roomId: string; users: User[] }) => {
      console.log('Joined room:', data.roomId);
      setRoomId(data.roomId);
      setUsers(data.users);
    });

    socket.on('user-joined', (user: User) => {
      console.log('User joined:', user);
      setUsers(prev => [...prev, user]);
    });

    socket.on('user-left', (userId: string) => {
      console.log('User left:', userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    });

    socket.on('code-changed', (newCode: string) => {
      onCodeChange(newCode);
    });

    socket.on('language-changed', (newLanguage: string) => {
      onLanguageChange(newLanguage);
    });

    socket.on('code-executed', () => {
      onRunCode();
    });

    socket.on('cursor-moved', (data: { userId: string; x: number; y: number }) => {
      setUsers(prev =>
        prev.map(user =>
          user.id === data.userId ? { ...user, cursor: { x: data.x, y: data.y } } : user
        )
      );
    });

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
      alert(`Connection error: ${error}`);
    });
  };

  const createRoom = () => {
    if (!socketRef.current) {
      initializeSocket();

      const waitForConnection = setInterval(() => {
        if (socketRef.current?.connected && currentUser) {
          clearInterval(waitForConnection);
          createRoom(); // Retry once connected
        }
      }, 200);
      return;
    }

    if (!isConnected || !currentUser) return;

    const newRoomId = generateRoomId();
    socketRef.current.emit('create-room', {
      roomId: newRoomId,
      user: currentUser,
      code,
      language
    });

    setRoomId(newRoomId);
    setJoinRoomId('');
    console.log('Room created:', newRoomId);
    alert(`Room created! Your Room ID is: ${newRoomId}`);
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    if (!socketRef.current) {
      initializeSocket();

      const waitForConnection = setInterval(() => {
        if (socketRef.current?.connected && currentUser) {
          clearInterval(waitForConnection);
          joinRoom();
        }
      }, 200);
      return;
    }

    if (!isConnected || !currentUser) return;

    socketRef.current.emit('join-room', {
      roomId: joinRoomId.toUpperCase(),
      user: currentUser
    });
  };

  const leaveRoom = () => {
    if (socketRef.current && roomId && currentUser?.id) {
      socketRef.current.emit('leave-room', { roomId, userId: currentUser.id });
    }
    setRoomId('');
    setUsers([]);
  };

  const handleCodeChange = (newCode: string) => {
    onCodeChange(newCode);
    if (socketRef.current && roomId) {
      socketRef.current.emit('code-change', { roomId, code: newCode });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange(newLanguage);
    if (socketRef.current && roomId) {
      socketRef.current.emit('language-change', { roomId, language: newLanguage });
    }
  };

  const handleRunCode = () => {
    onRunCode();
    if (socketRef.current && roomId) {
      socketRef.current.emit('execute-code', { roomId });
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      alert('Room ID copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const copyShareLink = async () => {
    const shareLink = `${window.location.origin}?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const handleClose = () => {
    // leaveRoom();
    onClose();
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Collaborate</h2>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' : 
              connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg flex items-center space-x-2">
          {connectionStatus === 'connected' ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm text-gray-300">
            Status: {connectionStatus === 'connected' ? 'Connected' : 
                    connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>

        {!roomId ? (
          // Not in a room - show options to create or join
          <div className="space-y-4">
            {/* Create Room */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Create New Room</h3>
              <p className="text-sm text-gray-400 mb-4">
                Start a new collaboration session and invite others to join
              </p>
              <button
                onClick={createRoom}
                // disabled={connectionStatus == 'connected'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Room</span>
              </button>
            </div>

            {/* Join Room */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Join Existing Room</h3>
              <p className="text-sm text-gray-400 mb-4">
                Enter a room ID to join someone else's session
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter Room ID (e.g., ABC123)"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={6}
                />
                <button
                  onClick={joinRoom}
                  // disabled={!joinRoomId.trim() || connectionStatus !== 'connected'}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Room</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // In a room - show room info and users
          <div className="space-y-4">
            {/* Room Info */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Room: {roomId}</h3>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={copyRoomId}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy ID</span>
                  </button>
                  <button
                    onClick={copyShareLink}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Link</span>
                  </button>
                </div>
                <button
                  onClick={leaveRoom}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Connected Users */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">
                Connected Users ({users.length + 1})
              </h3>
              <div className="space-y-2">
                {/* Current User */}
                {currentUser && (
                  <div className="flex items-center space-x-3 p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
                    <span className="text-xl">{currentUser.avatar}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{currentUser.name} (You)</p>
                      <p className="text-xs text-blue-300">Host</p>
                    </div>
                  </div>
                )}
                
                {/* Other Users */}
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg"
                  >
                    <span className="text-xl">{user.avatar}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ml-auto ${
                      user.isActive ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Share the room ID or link to invite collaborators
                  </p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}