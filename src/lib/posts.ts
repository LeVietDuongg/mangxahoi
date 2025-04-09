import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
  like_count?: number;
  comment_count?: number;
  is_liked?: boolean;
}

export async function createPost(
  userId: number,
  content: string,
  imageUrl?: string
): Promise<Post | { error: string }> {
  try {
    // Validate content
    if (!content.trim()) {
      return { error: 'Post content cannot be empty' };
    }

    // Create post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        image_url: imageUrl
      })
      .select();

    if (error) {
      console.error('Error creating post:', error);
      return { error: 'Failed to create post' };
    }

    return data[0] as Post;
  } catch (error) {
    console.error('Error creating post:', error);
    return { error: 'Failed to create post' };
  }
}

export async function getAllPosts(
  userId?: number,
  limit: number = 20,
  offset: number = 0
): Promise<{ posts: Post[] } | { error: string }> {
  try {
    let query = supabase
      .from('posts')
      .select(`
        id, 
        user_id, 
        content, 
        image_url, 
        created_at, 
        updated_at,
        users:user_id (username, avatar_url),
        likes:likes (id, user_id),
        comments:comments (id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error getting posts:', error);
      return { error: 'Failed to get posts' };
    }

    // Transform data to match expected format
    const posts = data.map(post => {
      const isLiked = userId ? post.likes.some(like => like.user_id === userId) : false;
      
      return {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        username: post.users?.username,
        avatar_url: post.users?.avatar_url,
        like_count: post.likes.length,
        comment_count: post.comments.length,
        is_liked: isLiked
      };
    });

    return { posts };
  } catch (error) {
    console.error('Error getting posts:', error);
    return { error: 'Failed to get posts' };
  }
}

export async function getPostById(
  postId: number,
  userId?: number
): Promise<{ post: Post } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, 
        user_id, 
        content, 
        image_url, 
        created_at, 
        updated_at,
        users:user_id (username, avatar_url),
        likes:likes (id, user_id),
        comments:comments (id)
      `)
      .eq('id', postId)
      .limit(1);

    if (error) {
      console.error('Error getting post:', error);
      return { error: 'Failed to get post' };
    }

    if (!data || data.length === 0) {
      return { error: 'Post not found' };
    }

    const post = data[0];
    const isLiked = userId ? post.likes.some(like => like.user_id === userId) : false;
    
    const formattedPost = {
      id: post.id,
      user_id: post.user_id,
      content: post.content,
      image_url: post.image_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      username: post.users?.username,
      avatar_url: post.users?.avatar_url,
      like_count: post.likes.length,
      comment_count: post.comments.length,
      is_liked: isLiked
    };

    return { post: formattedPost };
  } catch (error) {
    console.error('Error getting post:', error);
    return { error: 'Failed to get post' };
  }
}

export async function likePost(
  postId: number,
  userId: number
): Promise<{ success: true } | { error: string }> {
  try {
    // Check if post exists
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .limit(1);

    if (postError) {
      console.error('Error checking post:', postError);
      return { error: 'Failed to like post' };
    }

    if (!postData || postData.length === 0) {
      return { error: 'Post not found' };
    }

    // Check if already liked
    const { data: likeData, error: likeCheckError } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .limit(1);

    if (likeCheckError) {
      console.error('Error checking like:', likeCheckError);
      return { error: 'Failed to like post' };
    }

    if (likeData && likeData.length > 0) {
      // Unlike if already liked
      const { error: unlikeError } = await supabase
        .from('likes')
        .delete()
        .eq('id', likeData[0].id);

      if (unlikeError) {
        console.error('Error unliking post:', unlikeError);
        return { error: 'Failed to unlike post' };
      }
    } else {
      // Like if not already liked
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (likeError) {
        console.error('Error liking post:', likeError);
        return { error: 'Failed to like post' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error liking post:', error);
    return { error: 'Failed to like post' };
  }
}

export async function getUserPosts(
  userId: number,
  limit: number = 20,
  offset: number = 0
): Promise<{ posts: Post[] } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, 
        user_id, 
        content, 
        image_url, 
        created_at, 
        updated_at,
        users:user_id (username, avatar_url),
        likes:likes (id, user_id),
        comments:comments (id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting user posts:', error);
      return { error: 'Failed to get user posts' };
    }

    // Transform data to match expected format
    const posts = data.map(post => {
      const isLiked = post.likes.some(like => like.user_id === userId);
      
      return {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        username: post.users?.username,
        avatar_url: post.users?.avatar_url,
        like_count: post.likes.length,
        comment_count: post.comments.length,
        is_liked: isLiked
      };
    });

    return { posts };
  } catch (error) {
    console.error('Error getting user posts:', error);
    return { error: 'Failed to get user posts' };
  }
}
