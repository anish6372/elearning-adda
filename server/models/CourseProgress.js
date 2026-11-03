const mongoose = require("mongoose");

const LectureProgressSchema = new mongoose.Schema({
  lectureId: String,
  viewed: Boolean,
  dateViewed: Date,
  // seconds into the video, used to resume where the student left off
  position: { type: Number, default: 0 },
});

const CourseProgressSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  completed: Boolean,
  completionDate: Date,
  lecturesProgress: [LectureProgressSchema],
});

// Every progress lookup filters on both fields
CourseProgressSchema.index({ userId: 1, courseId: 1 });
CourseProgressSchema.index({ courseId: 1, completed: 1 });

module.exports = mongoose.model("Progress", CourseProgressSchema);
