require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const { initElasticsearch } = require("./helpers/elasticsearch");
const { getJwtSecret } = require("./helpers/jwt");
const { initQueues } = require("./helpers/queue");
const { initSocket } = require("./helpers/socket");
const { logger } = require("./helpers/observability");

getJwtSecret(); // fail fast if JWT_SECRET is missing

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/elearning";

// Socket.io shares the HTTP server (and port) with Express
const server = http.createServer(app);
initSocket(server);

//database connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info("mongodb is connected");
    initElasticsearch();
    initQueues();
  })
  .catch((e) => logger.error(e, "mongodb connection failed"));

server.listen(PORT, () => {
  logger.info(`Server is now running on port ${PORT}`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish, then close the DB
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    mongoose.connection.close(false).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
