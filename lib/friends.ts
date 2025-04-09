import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface Friendship {
  id: number;
  user_id1: number;
  user_id2: number;
  created_at: string;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export async function sendFriendRequest(
  senderId: number,
  receiverId: number
): Promise<FriendRequest | { error: string }> {
  try {
    // Check if users exist
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .in('id', [senderId, receiverId]);

    if (userError) {
      console.error('Error checking users:', userError);
      return { error: 'Failed to send friend request' };
    }

    if (!users || users.length < 2) {
      return { error: 'One or both users not found' };
    }

    // Check if already friends
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id1.eq.${senderId},user_id2.eq.${receiverId}),and(user_id1.eq.${receiverId},user_id2.eq.${senderId})`)
      .limit(1);

    if (friendshipError) {
      console.error('Error checking friendship:', friendshipError);
      return { error: 'Failed to send friend request' };
    }

    if (friendships && friendships.length > 0) {
      return { error: 'Already friends' };
    }

    // Check if request already exists
    const { data: existingRequests, error: requestError } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
      .limit(1);

    if (requestError) {
      console.error('Error checking existing requests:', requestError);
      return { error: 'Failed to send friend request' };
    }

    if (existingRequests && existingRequests.length > 0) {
      const existingRequest = existingRequests[0];
      if (existingRequest.status === 'pending') {
        return { error: 'Friend request already pending' };
      } else if (existingRequest.status === 'accepted') {
        return { error: 'Already friends' };
      }
    }

    // Create friend request
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select();

    if (error) {
      console.error('Error creating friend request:', error);
      return { error: 'Failed to send friend request' };
    }

    return data[0] as FriendRequest;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { error: 'Failed to send friend request' };
  }
}

export async function getFriendRequests(
  userId: number,
  type: 'sent' | 'received' = 'received'
): Promise<{ requests: any[] } | { error: string }> {
  try {
    let query = supabase
      .from('friend_requests')
      .select(`
        id, 
        sender_id, 
        receiver_id, 
        status, 
        created_at, 
        updated_at,
        sender:sender_id (username, avatar_url),
        receiver:receiver_id (username, avatar_url)
      `)
      .eq('status', 'pending');

    if (type === 'sent') {
      query = query.eq('sender_id', userId);
    } else {
      query = query.eq('receiver_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting friend requests:', error);
      return { error: 'Failed to get friend requests' };
    }

    // Format the requests to match the expected structure
    const requests = data.map(request => ({
      id: request.id,
      sender_id: request.sender_id,
      receiver_id: request.receiver_id,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      sender_username: request.sender?.username,
      sender_avatar_url: request.sender?.avatar_url,
      receiver_username: request.receiver?.username,
      receiver_avatar_url: request.receiver?.avatar_url
    }));

    return { requests };
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return { error: 'Failed to get friend requests' };
  }
}

export async function respondToFriendRequest(
  requestId: number,
  userId: number,
  accept: boolean
): Promise<{ success: true } | { error: string }> {
  try {
    // Check if request exists and is for this user
    const { data: requests, error: requestError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (requestError) {
      console.error('Error checking friend request:', requestError);
      return { error: 'Failed to respond to friend request' };
    }

    if (!requests || requests.length === 0) {
      return { error: 'Friend request not found or already processed' };
    }

    const request = requests[0];

    // Update request status
    const newStatus = accept ? 'accepted' : 'rejected';
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating friend request:', updateError);
      return { error: 'Failed to respond to friend request' };
    }

    // If accepted, create friendship
    if (accept) {
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id1: Math.min(request.sender_id, request.receiver_id),
          user_id2: Math.max(request.sender_id, request.receiver_id)
        });

      if (friendshipError) {
        console.error('Error creating friendship:', friendshipError);
        return { error: 'Failed to create friendship' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return { error: 'Failed to respond to friend request' };
  }
}

export async function getFriends(
  userId: number
): Promise<{ friends: any[] } | { error: string }> {
  try {
    // Get friendships where user is involved
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id, 
        user_id1, 
        user_id2, 
        created_at,
        user1:user_id1 (id, username, avatar_url, bio),
        user2:user_id2 (id, username, avatar_url, bio)
      `)
      .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);

    if (error) {
      console.error('Error getting friendships:', error);
      return { error: 'Failed to get friends' };
    }

    // Format the friends to match the expected structure
    const friends = data.map(friendship => {
      const isFriend1 = friendship.user_id1 === userId;
      const friend = isFriend1 ? friendship.user2 : friendship.user1;
      
      return {
        id: friendship.id,
        user_id1: friendship.user_id1,
        user_id2: friendship.user_id2,
        created_at: friendship.created_at,
        friend_id: friend.id,
        friend_username: friend.username,
        friend_avatar_url: friend.avatar_url,
        friend_bio: friend.bio
      };
    });

    return { friends };
  } catch (error) {
    console.error('Error getting friends:', error);
    return { error: 'Failed to get friends' };
  }
}

export async function removeFriend(
  userId: number,
  friendId: number
): Promise<{ success: true } | { error: string }> {
  try {
    // Check if friendship exists
    const { data, error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id1.eq.${userId},user_id2.eq.${friendId}),and(user_id1.eq.${friendId},user_id2.eq.${userId})`)
      .select();

    if (error) {
      console.error('Error removing friendship:', error);
      return { error: 'Failed to remove friend' };
    }

    if (!data || data.length === 0) {
      return { error: 'Friendship not found' };
    }

    // Also delete any friend requests between these users
    await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);

    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { error: 'Failed to remove friend' };
  }
}

export async function checkFriendship(
  userId: number,
  otherUserId: number
): Promise<{ status: 'friends' | 'pending_sent' | 'pending_received' | 'none' } | { error: string }> {
  try {
    // Check if already friends
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id1.eq.${userId},user_id2.eq.${otherUserId}),and(user_id1.eq.${otherUserId},user_id2.eq.${userId})`)
      .limit(1);

    if (friendshipError) {
      console.error('Error checking friendship:', friendshipError);
      return { error: 'Failed to check friendship status' };
    }

    if (friendships && friendships.length > 0) {
      return { status: 'friends' };
    }

    // Check for pending requests
    const { data: requests, error: requestError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .eq('status', 'pending')
      .limit(1);

    if (requestError) {
      console.error('Error checking friend requests:', requestError);
      return { error: 'Failed to check friendship status' };
    }

    if (requests && requests.length > 0) {
      const request = requests[0];
      if (request.sender_id === userId) {
        return { status: 'pending_sent' };
      } else {
        return { status: 'pending_received' };
      }
    }

    return { status: 'none' };
  } catch (error) {
    console.error('Error checking friendship status:', error);
    return { error: 'Failed to check friendship status' };
  }
}
