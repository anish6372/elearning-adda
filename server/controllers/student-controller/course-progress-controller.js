const CourseProgress = require("../../models/CourseProgress");
const Course = require("../../models/Course");
const StudentCourses = require("../../models/StudentCourses");

// Saves how far into a lecture the student is (called every few seconds by the player)
const saveLecturePosition = async (req, res) => {
  try {
    const { userId, courseId, lectureId, position } = req.body;

    // Try to update an existing lecture entry first, then fall back to pushing a new one
    const updated = await CourseProgress.updateOne(
      { userId, courseId, "lecturesProgress.lectureId": lectureId },
      { $set: { "lecturesProgress.$.position": position } }
    );

    if (updated.matchedCount === 0) {
      await CourseProgress.updateOne(
        { userId, courseId },
        { $push: { lecturesProgress: { lectureId, viewed: false, position } } },
        { upsert: true }
      );
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Some error occured!" });
  }
};

//mark current lecture as viewed
const markCurrentLectureAsViewed = async (req, res) => {
  try {
    const { userId, courseId, lectureId } = req.body;

    let progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = new CourseProgress({
        userId,
        courseId,
        lecturesProgress: [
          {
            lectureId,
            viewed: true,
            dateViewed: new Date(),
          },
        ],
      });
      await progress.save();
    } else {
      const lectureProgress = progress.lecturesProgress.find(
        (item) => item.lectureId === lectureId
      );

      if (lectureProgress) {
        lectureProgress.viewed = true;
        lectureProgress.dateViewed = new Date();
      } else {
        progress.lecturesProgress.push({
          lectureId,
          viewed: true,
          dateViewed: new Date(),
        });
      }
      await progress.save();
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    //check all the lectures are viewed or not
    const allLecturesViewed =
      progress.lecturesProgress.length === course.curriculum.length &&
      progress.lecturesProgress.every((item) => item.viewed);

    if (allLecturesViewed) {
      progress.completed = true;
      progress.completionDate = new Date();

      await progress.save();
    }

    res.status(200).json({
      success: true,
      message: "Lecture marked as viewed",
      data: progress,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

//get current course progress
const getCurrentCourseProgress = async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    const studentPurchasedCourses = await StudentCourses.findOne({ userId });

    const isCurrentCoursePurchasedByCurrentUserOrNot =
      studentPurchasedCourses?.courses?.findIndex(
        (item) => item.courseId === courseId
      ) > -1;

    if (!isCurrentCoursePurchasedByCurrentUserOrNot) {
      return res.status(200).json({
        success: true,
        data: {
          isPurchased: false,
        },
        message: "You need to purchase this course to access it.",
      });
    }

    const currentUserCourseProgress = await CourseProgress.findOne({
      userId,
      courseId,
    });

    if (
      !currentUserCourseProgress ||
      currentUserCourseProgress?.lecturesProgress?.length === 0
    ) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "No progress found, you can start watching the course",
        data: {
          courseDetails: course,
          progress: [],
          isPurchased: true,
        },
      });
    }

    const courseDetails = await Course.findById(courseId);

    res.status(200).json({
      success: true,
      data: {
        courseDetails,
        progress: currentUserCourseProgress.lecturesProgress,
        completed: currentUserCourseProgress.completed,
        completionDate: currentUserCourseProgress.completionDate,
        isPurchased: true,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

//reset course progress

const resetCurrentCourseProgress = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    const progress = await CourseProgress.findOne({ userId, courseId });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Progress not found!",
      });
    }

    progress.lecturesProgress = [];
    progress.completed = false;
    progress.completionDate = null;

    await progress.save();

    res.status(200).json({
      success: true,
      message: "Course progress has been reset",
      data: progress,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const getProgressSummaryForStudent = async (req, res) => {
  try {
    const { userId } = req.params;
    const studentPurchasedCourses = await StudentCourses.findOne({ userId });
    const purchased = studentPurchasedCourses?.courses || [];
    const courseIds = purchased.map((item) => item.courseId);

    const [progressDocs, courseDocs] = await Promise.all([
      CourseProgress.find({ userId, courseId: { $in: courseIds } }),
      Course.find({ _id: { $in: courseIds } }).select("curriculum"),
    ]);

    const progressByCourse = {};
    progressDocs.forEach((doc) => {
      progressByCourse[doc.courseId] = doc;
    });

    const totalByCourse = {};
    courseDocs.forEach((course) => {
      totalByCourse[String(course._id)] = course.curriculum?.length || 0;
    });

    const summary = {};
    purchased.forEach((item) => {
      const total = totalByCourse[item.courseId] || 0;
      const progress = progressByCourse[item.courseId];
      const viewed =
        progress?.lecturesProgress?.filter((lecture) => lecture.viewed)
          .length || 0;
      summary[item.courseId] = {
        viewed,
        total,
        percent: total ? Math.round((viewed / total) * 100) : 0,
        completed: Boolean(progress?.completed),
      };
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

module.exports = {
  saveLecturePosition,
  markCurrentLectureAsViewed,
  getCurrentCourseProgress,
  resetCurrentCourseProgress,
  getProgressSummaryForStudent,
};
