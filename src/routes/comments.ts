import { Router } from "express";
import {
  createComment,
  getComments,
  likeComment,
  replyToComment,
  getReplies,
} from "../controller/commentController";

const router = Router();

router.post("/", createComment); // body: { video_id, user_id, content }
router.get("/:videoId", getComments); // query param: sortBy =top|newest
router.post("/reply", replyToComment); // body: { comment_id, user_id, content }
router.post("/like", likeComment); // body: { comment_id, parent_comment_id (optional), is_reply, action: "like" | "dislike" }
router.get("/:commentId/replies", getReplies);

export default router;
