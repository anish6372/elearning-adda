const { startDb, stopDb, clearDb, api, makeUser, makeCourse } = require("./helpers/setup");
const Course = require("../models/Course");
const Order = require("../models/Order");
const StudentCourses = require("../models/StudentCourses");

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);
afterEach(() => {
  delete process.env.PAYPAL_WEBHOOK_ALLOW_UNVERIFIED;
});

const createOrder = (student, body) =>
  api().post("/student/order/create").set("Authorization", `Bearer ${student.token}`).send(body);

const capture = (student, orderId) =>
  api()
    .post("/student/order/capture")
    .set("Authorization", `Bearer ${student.token}`)
    .send({ orderId, paymentId: "PAY-1", payerId: "PAYER-1" });

describe("orders", () => {
  it("charges the database price, ignoring a tampered client price", async () => {
    const course = await makeCourse(makeUser({ role: "instructor" }), { pricing: 99 });
    const student = makeUser();

    const res = await createOrder(student, { courseId: String(course._id), coursePricing: 0.01 }).expect(201);
    const order = await Order.findById(res.body.data.orderId);
    expect(Number(order.coursePricing)).toBe(99);
    expect(order.userId).toBe(String(student._id));
  });

  it("enrolls the student exactly once even if capture is called repeatedly", async () => {
    const course = await makeCourse(makeUser({ role: "instructor" }));
    const student = makeUser();
    const { body } = await createOrder(student, { courseId: String(course._id) });

    const results = await Promise.all([capture(student, body.data.orderId), capture(student, body.data.orderId)]);
    results.forEach((r) => expect(r.status).toBe(200));

    const enrolled = await StudentCourses.findOne({ userId: String(student._id) });
    expect(enrolled.courses).toHaveLength(1);
    const updated = await Course.findById(course._id);
    expect(updated.students).toHaveLength(1);
  });

  it("does not let a user capture someone else's order", async () => {
    const course = await makeCourse(makeUser({ role: "instructor" }));
    const owner = makeUser();
    const { body } = await createOrder(owner, { courseId: String(course._id) });

    await capture(makeUser(), body.data.orderId).expect(404);
  });

  it("rejects unsigned PayPal webhooks", async () => {
    await api().post("/webhooks/paypal").send({ id: "WH-1", event_type: "PAYMENT.SALE.COMPLETED" }).expect(401);
  });

  it("processes a webhook event once and ignores redelivery", async () => {
    process.env.PAYPAL_WEBHOOK_ALLOW_UNVERIFIED = "true";
    const course = await makeCourse(makeUser({ role: "instructor" }));
    const student = makeUser();
    const { body } = await createOrder(student, { courseId: String(course._id) });
    await Order.updateOne({ _id: body.data.orderId }, { paymentId: "PAY-XYZ" });

    const event = { id: "WH-2", event_type: "PAYMENT.SALE.COMPLETED", resource: { parent_payment: "PAY-XYZ" } };
    const first = await api().post("/webhooks/paypal").send(event).expect(200);
    const second = await api().post("/webhooks/paypal").send(event).expect(200);

    expect(first.body.duplicate).toBeUndefined();
    expect(second.body.duplicate).toBe(true);
    expect((await Order.findById(body.data.orderId)).paymentStatus).toBe("paid");
  });
});
