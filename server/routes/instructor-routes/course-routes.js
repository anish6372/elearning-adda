const express = require("express");
const {
  addNewCourse,
  getAllCourses,
  getCourseDetailsByID,
  updateCourseByID,
} = require("../../controllers/instructor-controller/course-controller");
const authenticate = require("../../middleware/auth-middleware");
const { authorize } = require("../../middleware/authorize");
const { validate, courseSchema, coursePatchSchema } = require("../../middleware/validate");
const { getInstructorAnalytics } = require("../../controllers/instructor-controller/analytics-controller");
const router = express.Router();

router.use(authenticate, authorize("instructor"));

router.get("/analytics", getInstructorAnalytics);
router.post("/add", validate(courseSchema), addNewCourse);
router.get("/get", getAllCourses);
router.get("/get/details/:id", getCourseDetailsByID);
router.put("/update/:id", validate(coursePatchSchema), updateCourseByID);

module.exports = router;
