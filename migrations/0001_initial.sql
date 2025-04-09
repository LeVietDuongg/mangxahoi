-- Drop tables if they exist to ensure clean setup
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id bigint primary key generated always as identity,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
  id bigint primary key generated always as identity,
  user_id bigint NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes table
CREATE TABLE likes (
  id bigint primary key generated always as identity,
  user_id bigint NOT NULL,
  post_id bigint NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

-- Comments table
CREATE TABLE comments (
  id bigint primary key generated always as identity,
  user_id bigint NOT NULL,
  post_id bigint NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Friend requests table
CREATE TABLE friend_requests (
  id bigint primary key generated always as identity,
  sender_id bigint NOT NULL,
  receiver_id bigint NOT NULL,
  status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(sender_id, receiver_id)
);

-- Friendships table
CREATE TABLE friendships (
  id bigint primary key generated always as identity,
  user_id1 bigint NOT NULL,
  user_id2 bigint NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id1, user_id2)
);

-- Messages table
CREATE TABLE messages (
  id bigint primary key generated always as identity,
  sender_id bigint NOT NULL,
  receiver_id bigint NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friendships_user_id1 ON friendships(user_id1);
CREATE INDEX idx_friendships_user_id2 ON friendships(user_id2);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);

-- Insert some sample data
INSERT INTO users (username, email, password, bio) VALUES 
('user1', 'user1@example.com', '$2a$10$JwXdETcvJPEr4K.cCYo1FeK1MwMAHaXHDy5D3qvyBuwA6JZ.SA.Oi', 'Hello, I am user1'),
('user2', 'user2@example.com', '$2a$10$JwXdETcvJPEr4K.cCYo1FeK1MwMAHaXHDy5D3qvyBuwA6JZ.SA.Oi', 'Hello, I am user2'),
('user3', 'user3@example.com', '$2a$10$JwXdETcvJPEr4K.cCYo1FeK1MwMAHaXHDy5D3qvyBuwA6JZ.SA.Oi', 'Hello, I am user3');

-- Insert sample posts
INSERT INTO posts (user_id, content) VALUES 
(1, 'This is my first post!'),
(2, 'Hello world from user2'),
(3, 'Excited to join this social network!');

-- Insert sample comments
INSERT INTO comments (user_id, post_id, content) VALUES 
(2, 1, 'Welcome to the platform!'),
(3, 1, 'Nice to meet you!'),
(1, 2, 'Hello back to you!');

-- Insert sample likes
INSERT INTO likes (user_id, post_id) VALUES 
(2, 1),
(3, 1),
(1, 2);

-- Insert sample friend requests
INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES 
(1, 2, 'accepted'),
(1, 3, 'pending');

-- Insert sample friendships
INSERT INTO friendships (user_id1, user_id2) VALUES 
(1, 2);

-- Insert sample messages
INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES 
(1, 2, 'Hey, how are you?', TRUE),
(2, 1, 'I am good, thanks!', TRUE),
(1, 2, 'Want to hang out later?', FALSE);