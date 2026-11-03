const { Server } = require("socket.io");
const { verifyToken } = require("./jwt");
const { canAccessCourse } = require("./course-access");

let io = null;

// courseId -> Map(userId -> open socket count); counting sockets keeps multiple tabs from double counting
const presence = new Map();

const courseRoom = (courseId) => `course:${courseId}`;
const userRoom = (userId) => `user:${userId}`;

const presenceCount = (courseId) => presence.get(courseId)?.size || 0;

const addPresence = (courseId, userId) => {
  if (!presence.has(courseId)) presence.set(courseId, new Map());
  const users = presence.get(courseId);
  users.set(userId, (users.get(userId) || 0) + 1);
};

const removePresence = (courseId, userId) => {
  const users = presence.get(courseId);
  if (!users) return;
  const left = (users.get(userId) || 1) - 1;
  if (left <= 0) users.delete(userId);
  else users.set(userId, left);
  if (users.size === 0) presence.delete(courseId);
};

const broadcastPresence = (courseId) =>
  io.to(courseRoom(courseId)).emit("course:presence", { courseId, count: presenceCount(courseId) });

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true },
  });

  // Same JWT as the REST API, sent in the handshake: io(url, { auth: { token } })
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch (e) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    socket.join(userRoom(userId)); // personal channel for notifications
    socket.data.courses = new Set();

    socket.on("course:join", async ({ courseId } = {}, ack) => {
      if (!courseId || socket.data.courses.has(courseId)) return ack?.({ ok: true });
      if (!(await canAccessCourse(socket.user, courseId))) {
        return ack?.({ ok: false, message: "Not enrolled in this course" });
      }
      socket.join(courseRoom(courseId));
      socket.data.courses.add(courseId);
      addPresence(courseId, userId);
      broadcastPresence(courseId);
      ack?.({ ok: true });
    });

    socket.on("course:leave", ({ courseId } = {}) => {
      if (!socket.data.courses.has(courseId)) return;
      socket.leave(courseRoom(courseId));
      socket.data.courses.delete(courseId);
      removePresence(courseId, userId);
      broadcastPresence(courseId);
    });

    socket.on("disconnect", () => {
      socket.data.courses.forEach((courseId) => {
        removePresence(courseId, userId);
        broadcastPresence(courseId);
      });
    });
  });

  return io;
};

// No-ops until the socket server is started (e.g. in tests)
const emitToCourse = (courseId, event, payload) => io?.to(courseRoom(courseId)).emit(event, payload);

const emitToUsers = (userIds, event, payload) => {
  if (!io || !userIds.length) return;
  io.to(userIds.map((id) => userRoom(String(id)))).emit(event, payload);
};

module.exports = { initSocket, emitToCourse, emitToUsers, presenceCount };
