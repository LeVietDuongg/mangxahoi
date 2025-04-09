'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username?: string;
  sender_avatar_url?: string;
  receiver_username?: string;
  receiver_avatar_url?: string;
}

interface ConversationProps {
  userId: number;
}

export default function Conversation({ userId }: ConversationProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otherUserInfo, setOtherUserInfo] = useState<{
    username: string;
    avatar_url?: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock fetch conversation
  const fetchMessages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      // In a real app, fetch from API
      // For now, mock data
      const mockMessages = [
        {
          id: 1,
          sender_id: user.id,
          receiver_id: userId,
          content: "Hello there!",
          is_read: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sender_username: user.username,
          sender_avatar_url: user.avatar_url
        },
        {
          id: 2,
          sender_id: userId,
          receiver_id: user.id,
          content: "Hi! How are you?",
          is_read: true,
          created_at: new Date(Date.now() - 3000000).toISOString(),
          sender_username: "User" + userId,
          sender_avatar_url: undefined
        }
      ];

      setMessages(mockMessages);
      
      setOtherUserInfo({
        username: "User" + userId,
        avatar_url: undefined
      });
      
    } catch (error) {
      console.error('Fetch messages error:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user, userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newMessage.trim()) return;
    
    try {
      // In a real app, this would send via API or socket
      
      // Optimistically add message to UI
      const newMsg: Message = {
        id: Date.now(),
        sender_id: user.id,
        receiver_id: userId,
        content: newMessage,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_username: user.username,
        sender_avatar_url: user.avatar_url
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      setError('Failed to send message');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 my-4 text-center">
        <p className="text-gray-500">Please login to view messages</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[calc(100vh-200px)]">
      {/* Conversation header */}
      <div className="p-4 border-b flex items-center">
        <Link href={`/profile/${userId}`} className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden mr-3">
            {otherUserInfo?.avatar_url ? (
              <img 
                src={otherUserInfo.avatar_url} 
                alt={otherUserInfo.username} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white">
                {(otherUserInfo?.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold">{otherUserInfo?.username || 'User'}</div>
          </div>
        </Link>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === user.id;
              const showDate = index === 0 || 
                new Date(message.created_at).toDateString() !== 
                new Date(messages[index - 1].created_at).toDateString();
              
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    {!isCurrentUser && (
                      <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden mr-2 flex-shrink-0">
                        {message.sender_avatar_url ? (
                          <img 
                            src={message.sender_avatar_url} 
                            alt={message.sender_username || 'User'} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white">
                            {(message.sender_username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg px-4 py-2`}>
                      <div className="whitespace-pre-line">{message.content}</div>
                      <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
