const Course = require("../models/Course");

// A user can access a course's live features if they teach it or are enrolled in it.
const canAccessCourse = async (user, courseId) => {
  if (!user?._id || !courseId) return false;
  try {
    const course = await Course.findById(courseId).select("instructorId students.studentId").lean();
    if (!course) return false;
    const userId = String(user._id);
    return (
      course.instructorId === userId ||
      (course.students || []).some((student) => student.studentId === userId)
    );
  } catch (e) {
    return false; // invalid ObjectId
  }
};

module.exports = { canAccessCourse };
