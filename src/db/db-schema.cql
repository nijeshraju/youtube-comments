CREATE KEYSPACE IF NOT EXISTS youtube
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'};

USE youtube;

CREATE TABLE IF NOT EXISTS comments (
  video_id TEXT,
  comment_id UUID,
  user_id TEXT,
  content TEXT,
  created_at TIMESTAMP,
  like_count INT,
  dislike_count INT,
  PRIMARY KEY (video_id, comment_id, created_at)
) WITH CLUSTERING ORDER BY (comment_id ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS replies (
  comment_id UUID,
  reply_id UUID,
  user_id TEXT,
  content TEXT,
  created_at TIMESTAMP,
  like_count INT,
  dislike_count INT,
  PRIMARY KEY (comment_id, reply_id, created_at)
) WITH CLUSTERING ORDER BY (reply_id ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  comment_id TEXT,
  user_id TEXT,
  vote_type TEXT, -- 'like' or 'dislike'
  PRIMARY KEY (comment_id, user_id)
);