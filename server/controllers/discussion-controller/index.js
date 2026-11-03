const mongoose = require("mongoose");
const Discussion = require("../../models/Discussion");
const { canAccessCourse } = require("../../helpers/course-access");
const { emitToCourse } = require("../../helpers/socket");

const MAX_PAGE_SIZE = 50;

const ensureAccess = async (req, res) => {
  if (await canAccessCourse(req.user, req.params.courseId)) return true;
  res.status(403).json({ success: false, message: "You are not enrolled in this course" });
  return false;
};

// GET /discussions/:courseId?cursor=<lastId>&limit=10
// Cursor pagination on _id: stable under inserts, and an index seek instead of skip()
const getDiscussions = async (req, res) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const limit = Math.min(Number(req.query.limit) || 10, MAX_PAGE_SIZE);
    const filter = { courseId: req.params.courseId };
    if (req.query.cursor) {
      if (!mongoose.isValidObjectId(req.query.cursor)) {
        return res.status(400).json({ success: false, message: "Invalid cursor" });
      }
      filter._id = { $lt: req.query.cursor };
    }

    // Fetch one extra row to know whether another page exists
    const rows = await Discussion.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    res.status(200).json({
      success: true,
      data,
      pagination: { nextCursor: hasMore ? String(data[data.length - 1]._id) : null, hasMore },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Some error occured!" });
  }
};

const addQuestion = async (req, res) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const question = await Discussion.create({
      courseId: req.params.courseId,
      lectureId: req.body.lectureId,
      userId: String(req.user._id),
      userName: req.user.userName,
      text: req.body.text,
    });
    emitToCourse(req.params.courseId, "discussion:new", question);
    res.status(201).json({ success: true, data: question });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Some error occured!" });
  }
};

const addAnswer = async (req, res) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const answer = {
      userId: String(req.user._id),
      userName: req.user.userName,
      role: req.user.role,
      text: req.body.text,
    };
    const question = await Discussion.findOneAndUpdate(
      { _id: req.params.questionId, courseId: req.params.courseId },
      { $push: { answers: answer } },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    emitToCourse(req.params.courseId, "discussion:answer", question);
    res.status(201).json({ success: true, data: question });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Some error occured!" });
  }
};

module.exports = { getDiscussions, addQuestion, addAnswer };
