const { startDb, stopDb, clearDb, api, makeUser, makeCourse } = require("./helpers/setup");
const Order = require("../models/Order");
const CourseProgress = require("../models/CourseProgress");
const Review = require("../models/Review");
const Discussion = require("../models/Discussion");

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const enroll = (student) => ({
  studentId: String(student._id),
  studentName: student.userName,
  studentEmail: student.userEmail,
});

describe("instructor analytics", () => {
  it("aggregates revenue, completion rate and ratings from real data", async () => {
    const instructor = makeUser({ role: "instructor" });
    const [s1, s2] = [makeUser(), makeUser()];
    const course = await makeCourse(instructor, { students: [enroll(s1), enroll(s2)] });
    const paid = { instructorId: String(instructor._id), courseId: String(course._id), courseTitle: course.title };

    await Order.create([
      { ...paid, userId: String(s1._id), coursePricing: "49", paymentStatus: "paid", orderDate: new Date() },
      { ...paid, userId: String(s2._id), coursePricing: "29", paymentStatus: "paid", orderDate: new Date() },
      { ...paid, userId: "x", coursePricing: "1000", paymentStatus: "initiated", orderDate: new Date() },
    ]);
    await CourseProgress.create({ userId: String(s1._id), courseId: String(course._id), completed: true });
    await Review.create([
      { courseId: String(course._id), userId: String(s1._id), userName: "a", rating: 5 },
      { courseId: String(course._id), userId: String(s2._id), userName: "b", rating: 4 },
    ]);

    const { body } = await api()
      .get("/instructor/course/analytics")
      .set("Authorization", `Bearer ${instructor.token}`)
      .expect(200);

    expect(body.data.totalRevenue).toBe(78); // unpaid order excluded
    expect(body.data.totalStudents).toBe(2);
    expect(body.data.completionRate).toBe(50);
    expect(body.data.averageRating).toBe(4.5);
    expect(body.data.monthly).toHaveLength(6);
    expect(body.data.monthly[5].revenue).toBe(78);
  });
});

describe("course discussions", () => {
  it("is limited to enrolled students and the instructor", async () => {
    const course = await makeCourse(makeUser({ role: "instructor" }));
    await api()
      .post(`/discussions/${course._id}`)
      .set("Authorization", `Bearer ${makeUser().token}`)
      .send({ text: "hi" })
      .expect(403);
  });

  it("pages through questions with a cursor", async () => {
    const student = makeUser();
    const course = await makeCourse(makeUser({ role: "instructor" }), { students: [enroll(student)] });
    for (let i = 1; i <= 5; i++) {
      await Discussion.create({ courseId: String(course._id), userId: "u", text: `q${i}` });
    }

    const auth = { Authorization: `Bearer ${student.token}` };
    const page1 = await api().get(`/discussions/${course._id}?limit=2`).set(auth).expect(200);
    expect(page1.body.data.map((d) => d.text)).toEqual(["q5", "q4"]);
    expect(page1.body.pagination.hasMore).toBe(true);

    const page3 = await api()
      .get(`/discussions/${course._id}?limit=2&cursor=${page1.body.pagination.nextCursor}`)
      .set(auth)
      .expect(200);
    expect(page3.body.data.map((d) => d.text)).toEqual(["q3", "q2"]);
  });

  it("lets the instructor answer a question", async () => {
    const instructor = makeUser({ role: "instructor" });
    const course = await makeCourse(instructor);
    const question = await Discussion.create({ courseId: String(course._id), userId: "u", text: "why?" });

    const res = await api()
      .post(`/discussions/${course._id}/${question._id}/answers`)
      .set("Authorization", `Bearer ${instructor.token}`)
      .send({ text: "because" })
      .expect(201);
    expect(res.body.data.answers[0]).toMatchObject({ text: "because", role: "instructor" });
  });
});
