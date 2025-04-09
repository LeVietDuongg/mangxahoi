import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export async function createComment(
  postId: number,
  userId: number,
  content: string
): Promise<Comment | { error: string }> {
  try {
    // Validate content
    if (!content.trim()) {
      return { error: 'Comment content cannot be empty' };
    }

    // Check if post exists
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .limit(1);

    if (postError) {
      console.error('Error checking post:', postError);
      return { error: 'Failed to create comment' };
    }

    if (!postData || postData.length === 0) {
      return { error: 'Post not found' };
    }

    // Create comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content
      })
      .select(`
        id, 
        post_id, 
        user_id, 
        content, 
        created_at,
        users:user_id (username, avatar_url)
      `);

    if (error) {
      console.error('Error creating comment:', error);
      return { error: 'Failed to create comment' };
    }

    // Format the comment to match the expected structure
    const comment = data[0];
    return {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      username: comment.users?.username,
      avatar_url: comment.users?.avatar_url
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { error: 'Failed to create comment' };
  }
}

export async function getPostComments(
  postId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ comments: Comment[] } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, 
        post_id, 
        user_id, 
        content, 
        created_at,
        users:user_id (username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting comments:', error);
      return { error: 'Failed to get comments' };
    }

    // Format the comments to match the expected structure
    const comments = data.map(comment => ({
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      username: comment.users?.username,
      avatar_url: comment.users?.avatar_url
    }));

    return { comments };
  } catch (error) {
    console.error('Error getting comments:', error);
    return { error: 'Failed to get comments' };
  }
}

export async function deleteComment(
  commentId: number,
  userId: number
): Promise<{ success: true } | { error: string }> {
  try {
    // Check if comment exists and belongs to user
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .eq('user_id', userId)
      .limit(1);

    if (commentError) {
      console.error('Error checking comment:', commentError);
      return { error: 'Failed to delete comment' };
    }

    if (!commentData || commentData.length === 0) {
      return { error: 'Comment not found or you do not have permission to delete it' };
    }

    // Delete comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return { error: 'Failed to delete comment' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { error: 'Failed to delete comment' };
  }
}
