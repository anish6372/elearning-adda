// Shared test harness: in-memory MongoDB + helpers to create users and courses
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
delete process.env.PAYPAL_CLIENT_ID;
delete process.env.PAYPAL_SECRET_ID;

const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../../app");
const Course = require("../../models/Course");
const { signToken } = require("../../helpers/jwt");

let mongo;

const startDb = async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
};

const stopDb = async () => {
  await mongoose.disconnect();
  await mongo?.stop();
};

const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

const tokenFor = (user) =>
  signToken({ _id: String(user._id), userName: user.userName, userEmail: user.userEmail, role: user.role });

const makeUser = (overrides = {}) => {
  const id = new mongoose.Types.ObjectId();
  const user = { _id: id, userName: `user-${id}`, userEmail: `${id}@test.com`, role: "user", ...overrides };
  return { ...user, token: tokenFor(user) };
};

const makeCourse = (instructor, overrides = {}) =>
  Course.create({
    instructorId: String(instructor._id),
    instructorName: instructor.userName,
    title: "Node.js in Depth",
    pricing: 49,
    curriculum: [{ title: "Intro" }, { title: "Streams" }],
    students: [],
    ...overrides,
  });

const api = () => request(app);

module.exports = { startDb, stopDb, clearDb, makeUser, makeCourse, api, tokenFor };
