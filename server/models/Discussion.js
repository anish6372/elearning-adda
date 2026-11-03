const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: String,
  role: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const DiscussionSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  lectureId: String,
  userId: { type: String, required: true },
  userName: String,
  text: { type: String, required: true },
  answers: [AnswerSchema],
  createdAt: { type: Date, default: Date.now },
});

// Supports the cursor query: newest questions first within a course
DiscussionSchema.index({ courseId: 1, _id: -1 });

module.exports = mongoose.model("Discussion", DiscussionSchema);
