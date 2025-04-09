import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<User | { error: string }> {
  try {
    // Check if username or email already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return { error: 'Failed to register user' };
    }

    if (existingUsers && existingUsers.length > 0) {
      return { error: 'Username or email already exists' };
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password: hashedPassword
      })
      .select();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return { error: 'Failed to register user' };
    }

    return newUser[0] as User;
  } catch (error) {
    console.error('Register error:', error);
    return { error: 'Failed to register user' };
  }
}

export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Find user by username or email
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .limit(1);

    if (findError) {
      console.error('Error finding user:', findError);
      return { error: 'Failed to login' };
    }

    if (!users || users.length === 0) {
      return { error: 'Invalid username/email or password' };
    }

    const user = users[0] as User;

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid username/email or password' };
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return { user, token };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Failed to login' };
  }
}

export async function updateUserProfile(
  userId: number,
  data: { bio?: string; email?: string; avatar_url?: string }
): Promise<User | { error: string }> {
  try {
    // Check if email is being updated and if it's already taken
    if (data.email) {
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.email)
        .neq('id', userId)
        .limit(1);

      if (checkError) {
        console.error('Error checking existing email:', checkError);
        return { error: 'Failed to update profile' };
      }

      if (existingUsers && existingUsers.length > 0) {
        return { error: 'Email already in use' };
      }
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return { error: 'Failed to update profile' };
    }

    return updatedUser[0] as User;
  } catch (error) {
    console.error('Update profile error:', error);
    return { error: 'Failed to update profile' };
  }
}

export async function updateUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  try {
    // Get current user
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .limit(1);

    if (findError) {
      console.error('Error finding user:', findError);
      return { error: 'Failed to update password' };
    }

    if (!users || users.length === 0) {
      return { error: 'User not found' };
    }

    // Verify current password
    const isPasswordValid = await bcryptjs.compare(currentPassword, users[0].password);
    if (!isPasswordValid) {
      return { error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { error: 'Failed to update password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    return { error: 'Failed to update password' };
  }
}

export async function getUserById(userId: number): Promise<User | { error: string }> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, avatar_url, bio, created_at')
      .eq('id', userId)
      .limit(1);

    if (error) {
      console.error('Error getting user:', error);
      return { error: 'Failed to get user' };
    }

    if (!users || users.length === 0) {
      return { error: 'User not found' };
    }

    return users[0] as User;
  } catch (error) {
    console.error('Get user error:', error);
    return { error: 'Failed to get user' };
  }
}

export async function requireAuth(request: NextRequest): Promise<
  { user: User; token: string } | { response: NextResponse; user?: undefined; token?: undefined }
> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const userId = decoded.id;

    // Get user
    const userResult = await getUserById(userId);
    if ('error' in userResult) {
      return {
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    return { user: userResult, token };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }
}
