const express = require("express");
const {
  getCoursesByStudentId,
} = require("../../controllers/student-controller/student-courses-controller");

const authenticate = require("../../middleware/auth-middleware");
const { requireSelf } = require("../../middleware/authorize");

const router = express.Router();

router.get("/get/:studentId", authenticate, requireSelf("studentId"), getCoursesByStudentId);

module.exports = router;
