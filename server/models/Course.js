const mongoose = require("mongoose");

const LectureSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  public_id: String,
  freePreview: Boolean,
});

const CourseSchema = new mongoose.Schema({
  instructorId: String,
  instructorName: String,
  date: Date,
  title: String,
  category: String,
  level: String,
  primaryLanguage: String,
  subtitle: String,
  description: String,
  image: String,
  welcomeMessage: String,
  pricing: Number,
  objectives: String,
  students: [
    {
      studentId: String,
      studentName: String,
      studentEmail: String,
      paidAmount: String,
    },
  ],
  curriculum: [LectureSchema],
  isPublised: Boolean,
});

CourseSchema.index({ instructorId: 1 });
// Catalog filters + sort used by the student course list
CourseSchema.index({ category: 1, level: 1, primaryLanguage: 1, pricing: 1 });
CourseSchema.index({ "students.studentId": 1 });

module.exports = mongoose.model("Course", CourseSchema);
