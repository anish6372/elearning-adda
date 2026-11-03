const { startDb, stopDb, clearDb, api } = require("./helpers/setup");
const User = require("../models/User");

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const register = (body) =>
  api().post("/auth/register").send({ userName: "alice", userEmail: "alice@test.com", password: "secret1", ...body });

const login = () => api().post("/auth/login").send({ userEmail: "alice@test.com", password: "secret1" });

const cookieFrom = (res) => res.headers["set-cookie"]?.find((c) => c.startsWith("refreshToken="));

describe("auth", () => {
  it("rejects invalid registration input with field errors", async () => {
    const res = await api().post("/auth/register").send({ userName: "a", userEmail: "nope", password: "1" });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(["userName", "userEmail", "password"]);
  });

  it("never lets a client register as admin", async () => {
    await register({ role: "admin" }).expect(201);
    const user = await User.findOne({ userEmail: "alice@test.com" });
    expect(user.role).toBe("user");
  });

  it("issues a short-lived access token and an httpOnly refresh cookie on login", async () => {
    await register();
    const res = await login().expect(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(cookieFrom(res)).toMatch(/HttpOnly/i);
    expect(cookieFrom(res)).toMatch(/Path=\/auth/);
  });

  it("rotates refresh tokens and revokes all sessions when an old one is reused", async () => {
    await register();
    const first = cookieFrom(await login()).split(";")[0];

    const refreshed = await api().post("/auth/refresh").set("Cookie", first).expect(200);
    const second = cookieFrom(refreshed).split(";")[0];
    expect(second).not.toBe(first);

    // Replaying the rotated token looks like theft: it fails and kills the newest session too
    await api().post("/auth/refresh").set("Cookie", first).expect(401);
    await api().post("/auth/refresh").set("Cookie", second).expect(401);
  });

  it("logout revokes the refresh token", async () => {
    await register();
    const cookie = cookieFrom(await login()).split(";")[0];
    await api().post("/auth/logout").set("Cookie", cookie).expect(200);
    await api().post("/auth/refresh").set("Cookie", cookie).expect(401);
  });
});
