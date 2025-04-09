'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface Conversation {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  other_user_id: number;
  other_username: string;
  other_avatar_url?: string;
  unread_count: number;
}

export default function ConversationList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      // In a real app, this would fetch from API
      // For now, use mock data if no API is available
      const mockConversations = [
        {
          id: 1,
          sender_id: user.id,
          receiver_id: 2,
          content: "Hello, how are you?",
          is_read: true,
          created_at: new Date().toISOString(),
          other_user_id: 2,
          other_username: "User2",
          other_avatar_url: "",
          unread_count: 0
        }
      ];

      setConversations(mockConversations);
    } catch (error) {
      console.error('Fetch conversations error:', error);
      setError('Đã xảy ra lỗi khi tải danh sách tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // If this year, show day and month
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'numeric'
      });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Messages</h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 mb-4">No conversations yet</p>
          <Link 
            href="/friends" 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Find friends
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {conversations.map(conversation => (
            <li key={conversation.id}>
              <Link 
                href={`/messages/${conversation.other_user_id}`}
                className="p-4 flex items-center hover:bg-gray-50"
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden mr-4">
                    {conversation.other_avatar_url ? (
                      <img 
                        src={conversation.other_avatar_url} 
                        alt={conversation.other_username} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white">
                        {conversation.other_username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">{conversation.other_username}</h3>
                    <span className="text-xs text-gray-500">{formatTime(conversation.created_at)}</span>
                  </div>
                  <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-medium' : 'text-gray-500'}`}>
                    {conversation.sender_id === user.id ? 'You: ' : ''}
                    {conversation.content}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
