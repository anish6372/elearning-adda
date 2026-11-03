const { startDb, stopDb, clearDb, api, makeUser, makeCourse } = require("./helpers/setup");

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe("authorization", () => {
  it("requires a token for instructor routes", async () => {
    await api().get("/instructor/course/get").expect(401);
  });

  it("blocks students from instructor routes", async () => {
    const student = makeUser();
    await api().get("/instructor/course/get").set("Authorization", `Bearer ${student.token}`).expect(403);
  });

  it("stops a user from reading another user's data", async () => {
    const student = makeUser();
    await api()
      .get(`/student/courses-bought/get/${makeUser()._id}`)
      .set("Authorization", `Bearer ${student.token}`)
      .expect(403);
  });

  it("only lets an instructor update their own course", async () => {
    const owner = makeUser({ role: "instructor" });
    const other = makeUser({ role: "instructor" });
    const course = await makeCourse(owner);

    await api()
      .put(`/instructor/course/update/${course._id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ title: "Hijacked" })
      .expect(404);

    const res = await api()
      .put(`/instructor/course/update/${course._id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Updated", instructorId: String(other._id) })
      .expect(200);
    expect(res.body.data.title).toBe("Updated");
    expect(res.body.data.instructorId).toBe(String(owner._id)); // ownership cannot be reassigned
  });

  it("stamps new courses with the logged-in instructor", async () => {
    const instructor = makeUser({ role: "instructor" });
    const res = await api()
      .post("/instructor/course/add")
      .set("Authorization", `Bearer ${instructor.token}`)
      .send({ title: "Mine", instructorId: "someone-else", pricing: 10 })
      .expect(201);
    expect(res.body.data.instructorId).toBe(String(instructor._id));
  });
});
