const Course = require("../../models/Course");
const Order = require("../../models/Order");
const CourseProgress = require("../../models/CourseProgress");
const Review = require("../../models/Review");

const MONTHS_BACK = 6;

// GET /instructor/analytics — every number on the instructor dashboard comes from MongoDB aggregations
const getInstructorAnalytics = async (req, res) => {
  try {
    const instructorId = String(req.user._id);
    const since = new Date();
    since.setMonth(since.getMonth() - (MONTHS_BACK - 1), 1);
    since.setHours(0, 0, 0, 0);

    const courses = await Course.find({ instructorId }).select("_id title students.studentId").lean();
    const courseIds = courses.map((c) => String(c._id));
    const enrollments = courses.reduce((sum, c) => sum + (c.students?.length || 0), 0);

    const [revenueByMonth, revenueByCourse, completed, ratings] = await Promise.all([
      Order.aggregate([
        { $match: { instructorId, paymentStatus: "paid", orderDate: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: "$orderDate" }, month: { $month: "$orderDate" } },
            revenue: { $sum: { $toDouble: "$coursePricing" } },
            sales: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $match: { instructorId, paymentStatus: "paid" } },
        {
          $group: {
            _id: "$courseId",
            title: { $first: "$courseTitle" },
            revenue: { $sum: { $toDouble: "$coursePricing" } },
            sales: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      CourseProgress.countDocuments({ courseId: { $in: courseIds }, completed: true }),
      Review.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);

    // Fill months with no sales so the chart always has MONTHS_BACK points
    const monthly = [];
    for (let i = 0; i < MONTHS_BACK; i++) {
      const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
      const hit = revenueByMonth.find((m) => m._id.year === d.getFullYear() && m._id.month === d.getMonth() + 1);
      monthly.push({
        label: d.toLocaleString("en-US", { month: "short" }),
        year: d.getFullYear(),
        revenue: hit?.revenue || 0,
        sales: hit?.sales || 0,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalCourses: courses.length,
        totalStudents: enrollments,
        totalRevenue: revenueByCourse.reduce((sum, c) => sum + c.revenue, 0),
        topCourse: revenueByCourse[0] || null,
        completionRate: enrollments ? Math.round((completed / enrollments) * 1000) / 10 : 0,
        averageRating: ratings[0] ? Math.round(ratings[0].average * 10) / 10 : null,
        reviewCount: ratings[0]?.count || 0,
        monthly,
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Some error occured!" });
  }
};

module.exports = { getInstructorAnalytics };
