const express = require("express");
const { addReview, getCourseReviews } = require("../../controllers/review-controller/index");

const { bindBodyUser } = require("../../middleware/authorize");
const { validate, reviewSchema } = require("../../middleware/validate");
const authenticate = require("../../middleware/auth-middleware");

const router = express.Router();

router.post("/add", authenticate, bindBodyUser("userId"), validate(reviewSchema), addReview);
router.get("/:courseId", getCourseReviews);

module.exports = router;
