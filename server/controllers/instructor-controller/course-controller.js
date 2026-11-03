const Course = require("../../models/Course");
const { indexCourse } = require("../../helpers/elasticsearch");
const { invalidateCache } = require("../../helpers/redis");
const { emitToCourse, emitToUsers } = require("../../helpers/socket");

// Pushes a real-time notification to every enrolled student when lectures are added
const notifyNewLectures = (before, updated) => {
  const oldIds = new Set((before?.curriculum || []).map((l) => String(l._id)));
  const added = (updated.curriculum || []).filter((l) => !oldIds.has(String(l._id)));
  if (!before || !added.length) return;

  const payload = {
    type: "new-lecture",
    courseId: String(updated._id),
    courseTitle: updated.title,
    lectures: added.map((l) => ({ _id: l._id, title: l.title })),
    message: `${added.length} new lecture${added.length > 1 ? "s" : ""} in ${updated.title}`,
  };
  emitToCourse(String(updated._id), "course:lecture-added", payload);
  emitToUsers((updated.students || []).map((s) => s.studentId), "notification", payload);
};

const addNewCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructorId: String(req.user._id),
      instructorName: req.user.userName,
    };
    const newlyCreatedCourse = new Course(courseData);
    const saveCourse = await newlyCreatedCourse.save();

    if (saveCourse) {
      // Sync to Elasticsearch index asynchronously
      indexCourse(saveCourse);
      invalidateCache("courses:list:*");

      res.status(201).json({
        success: true,
        message: "Course saved successfully",
        data: saveCourse,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const coursesList = await Course.find({ instructorId: String(req.user._id) });

    res.status(200).json({
      success: true,
      data: coursesList,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const getCourseDetailsByID = async (req, res) => {
  try {
    const { id } = req.params;
    const courseDetails = await Course.findById(id);

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Course not found!",
      });
    }

    if (courseDetails.instructorId !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own courses",
      });
    }

    res.status(200).json({
      success: true,
      data: courseDetails,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const updateCourseByID = async (req, res) => {
  try {
    const { id } = req.params;
    // instructorId / students must not be changed through this endpoint
    const { instructorId, students, ...updatedCourseData } = req.body;

    const before = await Course.findOne({ _id: id, instructorId: String(req.user._id) })
      .select("curriculum._id")
      .lean();

    const updatedCourse = await Course.findOneAndUpdate(
      { _id: id, instructorId: String(req.user._id) },
      updatedCourseData,
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found!",
      });
    }

    // Sync updated course to Elasticsearch index
    indexCourse(updatedCourse);
    invalidateCache("courses:list:*");
    notifyNewLectures(before, updatedCourse);

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};


module.exports = {
  addNewCourse,
  getAllCourses,
  updateCourseByID,
  getCourseDetailsByID,
};
