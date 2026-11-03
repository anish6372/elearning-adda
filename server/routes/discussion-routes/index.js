const express = require("express");
const {
  getDiscussions,
  addQuestion,
  addAnswer,
} = require("../../controllers/discussion-controller/index");
const authenticate = require("../../middleware/auth-middleware");
const { validate, discussionSchema } = require("../../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/:courseId", getDiscussions);
router.post("/:courseId", validate(discussionSchema), addQuestion);
router.post("/:courseId/:questionId/answers", validate(discussionSchema), addAnswer);

module.exports = router;
