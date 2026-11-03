// Express app only (no DB connection or listen) so tests can import it with supertest
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth-routes/index");
const mediaRoutes = require("./routes/instructor-routes/media-routes");
const instructorCourseRoutes = require("./routes/instructor-routes/course-routes");
const studentViewCourseRoutes = require("./routes/student-routes/course-routes");
const studentViewOrderRoutes = require("./routes/student-routes/order-routes");
const studentCoursesRoutes = require("./routes/student-routes/student-courses-routes");
const studentCourseProgressRoutes = require("./routes/student-routes/course-progress-routes");
const aiRoutes = require("./routes/ai-routes/index");
const reviewRoutes = require("./routes/review-routes/index");
const certificateRoutes = require("./routes/certificate-routes/index");
const whatsappRoutes = require("./routes/whatsapp-routes/index");
const jobRoutes = require("./routes/job-routes/index");
const discussionRoutes = require("./routes/discussion-routes/index");
const webhookRoutes = require("./routes/webhook-routes/index");
const { isRedisReady } = require("./helpers/redis");
const { logger, requestLogger, metricsMiddleware, metricsHandler } = require("./helpers/observability");

const app = express();

// Behind a reverse proxy (nginx / cloud LB) so rate limiting sees the real client IP
app.set("trust proxy", 1);

app.use(requestLogger);
app.use(metricsMiddleware);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  const database = mongoose.connection.readyState === 1 ? "up" : "down";
  res.status(database === "up" ? 200 : 503).json({
    status: database === "up" ? "ok" : "degraded",
    uptime: process.uptime(),
    services: { database, redis: isRedisReady() ? "up" : "down" },
  });
});
app.get("/metrics", metricsHandler);

// Global limiter plus a much stricter one on credential endpoints (brute-force protection)
const skipInTests = () => process.env.NODE_ENV === "test";
app.use(
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false, skip: skipInTests })
);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: "Too many attempts, please try again later" },
});
app.use(["/auth/login", "/auth/register", "/auth/google", "/auth/2fa/validate"], authLimiter);

//routes configuration
app.use("/auth", authRoutes);
app.use("/media", mediaRoutes);
app.use("/instructor/course", instructorCourseRoutes);
app.use("/student/course", studentViewCourseRoutes);
app.use("/student/order", studentViewOrderRoutes);
app.use("/student/courses-bought", studentCoursesRoutes);
app.use("/student/course-progress", studentCourseProgressRoutes);
app.use("/ai", aiRoutes);
app.use("/reviews", reviewRoutes);
app.use("/certificates", certificateRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/jobs", jobRoutes);
app.use("/discussions", discussionRoutes);
app.use("/webhooks", webhookRoutes);

app.use((err, req, res, next) => {
  logger.error({ err, reqId: req.id }, "Unhandled error");
  res.status(500).json({
    success: false,
    message: "Something went wrong",
    requestId: req.id,
  });
});

module.exports = app;
