const express = require("express");
const {
  getCurrentCourseProgress,
  markCurrentLectureAsViewed,
  resetCurrentCourseProgress,
  getProgressSummaryForStudent,
  saveLecturePosition,
} = require("../../controllers/student-controller/course-progress-controller");

const authenticate = require("../../middleware/auth-middleware");
const { requireSelf, bindBodyUser } = require("../../middleware/authorize");
const { validate, lecturePositionSchema } = require("../../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/get/:userId/:courseId", requireSelf("userId"), getCurrentCourseProgress);
router.get("/summary/:userId", requireSelf("userId"), getProgressSummaryForStudent);
router.post("/mark-lecture-viewed", bindBodyUser("userId"), markCurrentLectureAsViewed);
router.post("/position", bindBodyUser("userId"), validate(lecturePositionSchema), saveLecturePosition);
router.post("/reset-progress", bindBodyUser("userId"), resetCurrentCourseProgress);
module.exports = router;
