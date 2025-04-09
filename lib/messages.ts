import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface Message {
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

export async function sendMessage(
  senderId: number,
  receiverId: number,
  content: string
): Promise<Message | { error: string }> {
  try {
    // Validate content
    if (!content.trim()) {
      return { error: 'Message content cannot be empty' };
    }

    // Check if users exist
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .in('id', [senderId, receiverId]);

    if (userError) {
      console.error('Error checking users:', userError);
      return { error: 'Failed to send message' };
    }

    if (!users || users.length < 2) {
      return { error: 'One or both users not found' };
    }

    // Check if sender and receiver are friends
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id1.eq.${senderId},user_id2.eq.${receiverId}),and(user_id1.eq.${receiverId},user_id2.eq.${senderId})`)
      .limit(1);

    if (friendshipError) {
      console.error('Error checking friendship:', friendshipError);
      return { error: 'Failed to send message' };
    }

    if (!friendships || friendships.length === 0) {
      return { error: 'You can only send messages to friends' };
    }

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        is_read: false
      })
      .select(`
        id, 
        sender_id, 
        receiver_id, 
        content, 
        is_read, 
        created_at,
        sender:sender_id (username, avatar_url),
        receiver:receiver_id (username, avatar_url)
      `);

    if (error) {
      console.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }

    // Format the message to match the expected structure
    const message = data[0];
    return {
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      is_read: message.is_read,
      created_at: message.created_at,
      sender_username: message.sender?.username,
      sender_avatar_url: message.sender?.avatar_url,
      receiver_username: message.receiver?.username,
      receiver_avatar_url: message.receiver?.avatar_url
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Failed to send message' };
  }
}

export async function markMessageAsRead(
  messageId: number,
  userId: number
): Promise<{ success: true } | { error: string }> {
  try {
    // Check if message exists and user is the receiver
    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', messageId)
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .limit(1);

    if (messageError) {
      console.error('Error checking message:', messageError);
      return { error: 'Failed to mark message as read' };
    }

    if (!messages || messages.length === 0) {
      return { error: 'Message not found or already read' };
    }

    // Mark as read
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      return { error: 'Failed to mark message as read' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return { error: 'Failed to mark message as read' };
  }
}

export async function getConversation(
  userId: number,
  otherUserId: number,
  limit: number = 50,
  before?: number
): Promise<{ messages: Message[] } | { error: string }> {
  try {
    let query = supabase
      .from('messages')
      .select(`
        id, 
        sender_id, 
        receiver_id, 
        content, 
        is_read, 
        created_at,
        sender:sender_id (username, avatar_url),
        receiver:receiver_id (username, avatar_url)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);

    if (before) {
      query = query.lt('id', before);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error getting conversation:', error);
      return { error: 'Failed to get conversation' };
    }

    // Mark messages as read
    const messagesToMark = data
      .filter(m => m.receiver_id === userId && !m.is_read)
      .map(m => m.id);

    if (messagesToMark.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messagesToMark);

      // Update is_read status in results
      data.forEach(m => {
        if (m.receiver_id === userId) {
          m.is_read = true;
        }
      });
    }

    // Format the messages to match the expected structure
    const messages = data.map(message => ({
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      is_read: message.is_read,
      created_at: message.created_at,
      sender_username: message.sender?.username,
      sender_avatar_url: message.sender?.avatar_url,
      receiver_username: message.receiver?.username,
      receiver_avatar_url: message.receiver?.avatar_url
    }));

    return { messages };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return { error: 'Failed to get conversation' };
  }
}

export async function getConversationList(
  userId: number
): Promise<{ conversations: any[] } | { error: string }> {
  try {
    // This is a complex query that needs to be handled differently in Supabase
    // We'll use a simpler approach to get the latest message from each conversation

    // First, get all messages involving the user
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id, 
        sender_id, 
        receiver_id, 
        content, 
        is_read, 
        created_at,
        sender:sender_id (username, avatar_url),
        receiver:receiver_id (username, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error getting messages:', messagesError);
      return { error: 'Failed to get conversation list' };
    }

    // Group messages by conversation partner
    const conversationMap = new Map();
    
    allMessages.forEach(message => {
      const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
      
      if (!conversationMap.has(otherUserId)) {
        // Get the other user's info
        const otherUser = message.sender_id === userId ? message.receiver : message.sender;
        
        conversationMap.set(otherUserId, {
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          is_read: message.is_read,
          created_at: message.created_at,
          other_user_id: otherUserId,
          other_username: otherUser?.username,
          other_avatar_url: otherUser?.avatar_url,
          unread_count: 0
        });
      }
    });

    // Count unread messages for each conversation
    const { data: unreadCounts, error: unreadError } = await supabase
      .from('messages')
      .select('sender_id, count')
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .group('sender_id');

    if (unreadError) {
      console.error('Error getting unread counts:', unreadError);
      // Continue anyway, just won't have unread counts
    } else if (unreadCounts) {
      unreadCounts.forEach(item => {
        if (conversationMap.has(item.sender_id)) {
          conversationMap.get(item.sender_id).unread_count = item.count;
        }
      });
    }

    // Convert map to array and sort by latest message
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { conversations };
  } catch (error) {
    console.error('Error getting conversation list:', error);
    return { error: 'Failed to get conversation list' };
  }
}
