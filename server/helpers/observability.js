const crypto = require("crypto");
const pino = require("pino");
const pinoHttp = require("pino-http");
const client = require("prom-client");

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info"),
  // pretty logs locally; plain JSON in production (for log shippers) and no worker thread in tests
  transport: ["production", "test"].includes(process.env.NODE_ENV)
    ? undefined
    : { target: "pino-pretty", options: { colorize: true } },
  redact: ["req.headers.authorization", "req.headers.cookie"],
});

// Every request gets an id (reused from X-Request-Id when a proxy sets one) that is logged and echoed back
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
  autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/metrics" },
});

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

// Labels by the matched Express route (/course/:id), not the raw URL, to keep metric cardinality bounded
const metricsMiddleware = (req, res, next) => {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
};

const metricsHandler = async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
};

module.exports = { logger, requestLogger, metricsMiddleware, metricsHandler, registry };
