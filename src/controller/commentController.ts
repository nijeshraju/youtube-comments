import { Request, Response } from "express";
import { client } from "../scyllaClient";
import { v4 as uuidv4 } from "uuid";

// add comment
export const createComment = async (req: Request, res: Response) => {
  const { video_id, user_id, content } = req.body;
  const comment_id = uuidv4();
  const created_at = new Date();

  const query = `INSERT INTO youtube.comments (video_id, comment_id, user_id, content, created_at, like_count, dislike_count)
                 VALUES (?, ?, ?, ?, ?, 0, 0)`;

  await client.execute(
    query,
    [video_id, comment_id, user_id, content, created_at],
    { prepare: true },
  );
  res.json({ message: "Comment added", comment_id });
};

// get comment list
export const getComments = async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { sortBy } = req.query; // top or newest

  const query = `SELECT * FROM youtube.comments WHERE video_id = ?`;
  const result = await client.execute(query, [videoId], { prepare: true });
  let comments = result.rows;

  // by deafult newest
  if (sortBy === "top") {
    comments = comments.sort((a, b) => {
      const aLikes = a.like_count || 0;
      const bLikes = b.like_count || 0;

      // if both have 0 likes, then sort by latest
      if (aLikes === 0 && bLikes === 0) {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      return bLikes - aLikes;
    });
  }

  for (const comment of comments) {
    const repliesCount = await client.execute(
      `SELECT COUNT(*) FROM youtube.replies WHERE comment_id = ?`,
      [comment.comment_id],
      { prepare: true },
    );
    comment.replies_count = repliesCount.rows[0].count;
  }

  res.json(comments);
};

// reply to comment
export const replyToComment = async (req: Request, res: Response) => {
  const { comment_id, user_id, content } = req.body;
  const reply_id = uuidv4();
  const created_at = new Date();

  const query = `INSERT INTO youtube.replies (comment_id, reply_id, user_id, content, created_at, like_count, dislike_count)
                   VALUES (?, ?, ?, ?, ?, 0, 0)`;

  await client.execute(
    query,
    [comment_id, reply_id, user_id, content, created_at],
    { prepare: true },
  );

  res.json({ message: "Reply added", reply_id });
};

// like or dilike comment
// export const likeComment = async (req: Request, res: Response) => {
//   const { comment_id, user_id, is_reply, action } = req.body;

//   const existingVoteQuery = `SELECT * FROM youtube.votes WHERE comment_id = ? AND user_id = ?`;
//   const existingVote = await client.execute(
//     existingVoteQuery,
//     [comment_id, user_id],
//     { prepare: true },
//   );

//   if (existingVote.rowLength > 0) {
//     res
//       .status(400)
//       .json({ message: "User already voted on this comment/reply" });
//     return;
//   }

//   const table = is_reply ? "youtube.replies" : "youtube.comments";
//   const idField = is_reply ? "reply_id" : "comment_id";
//   const updateField = action === "like" ? "like_count" : "dislike_count";

//   const selectQuery = `SELECT ${updateField} FROM ${table} WHERE ${idField} = ? ALLOW FILTERING`;
//   const result = await client.execute(selectQuery, [comment_id], { prepare: true });
//   if (result.rowLength === 0) {
//     res.status(404).json({ message: "Comment/Reply not found" });
//     return;
//   }

//   const row = result.first();
//   const newCount = (row[updateField] || 0) + 1;
//   const createdAt = row.created_at;

//   const query = `UPDATE ${table} SET ${updateField} =? WHERE ${idField} = ? AND created_at = `;

//   await client.execute(query, [newCount, comment_id, createdAt], { prepare: true });

//   const votesQuery = `INSERT INTO youtube.votes (comment_id, user_id, vote_type) VALUES (?, ?, ?)`;
//   await client.execute(votesQuery, [comment_id, user_id, action], {
//     prepare: true,
//   });

//   res.json({ message: `${action} recorded` });
// };

export const likeComment = async (req: Request, res: Response) => {
  const { comment_id, user_id, is_reply, action } = req.body;

  const existingVoteQuery = `SELECT * FROM youtube.votes WHERE comment_id = ? AND user_id = ?`;
  const existingVote = await client.execute(existingVoteQuery, [comment_id, user_id], { prepare: true });

  if (existingVote.rowLength > 0) {
    res.status(400).json({ message: "User already voted on this comment/reply" });
    return;
  }

  const table = is_reply ? "youtube.replies" : "youtube.comments";
  const idField = is_reply ? "reply_id" : "comment_id";
  const updateField = action === "like" ? "like_count" : "dislike_count";

  // Need full primary key for WHERE clause — include partition key + clustering key(s)
  const selectQuery = `SELECT ${updateField}, comment_id, created_at FROM ${table} WHERE ${idField} = ? ALLOW FILTERING`;
  const result = await client.execute(selectQuery, [comment_id], { prepare: true });

  if (result.rowLength === 0) {
    res.status(404).json({ message: "Comment/Reply not found" });
    return;
  }

  const row = result.first();
  const newCount = (row[updateField] || 0) + 1;

  // You need *full* primary key to perform UPDATE for regular INT column
  const createdAt = row.created_at;
  const partitionKey = is_reply ? row.comment_id : row.video_id;

  const updateQuery = is_reply
    ? `UPDATE ${table} SET ${updateField} = ? WHERE comment_id = ? AND reply_id = ? AND created_at = ?`
    : `UPDATE ${table} SET ${updateField} = ? WHERE video_id = ? AND comment_id = ? AND created_at = ?`;

  const updateParams = is_reply
    ? [newCount, row.comment_id, comment_id, createdAt]
    : [newCount, partitionKey, comment_id, createdAt];

  await client.execute(updateQuery, updateParams, { prepare: true });

  // Insert into vote log
  const votesQuery = `INSERT INTO youtube.votes (comment_id, user_id, vote_type) VALUES (?, ?, ?)`;
  await client.execute(votesQuery, [comment_id, user_id, action], { prepare: true });

  res.json({ message: `${action} recorded` });
};


// get replies
export const getReplies = async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const result = await client.execute(
    `SELECT * FROM youtube.replies WHERE comment_id = ?`,
    [commentId],
    { prepare: true },
  );

  res.json(result.rows);
};
