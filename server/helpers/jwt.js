const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
};

// Falls back to a secret derived from JWT_SECRET so refresh tokens can never be used as access tokens.
const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || `${getJwtSecret()}:refresh`;

const signToken = (payload, options = { expiresIn: ACCESS_TOKEN_TTL }) =>
  jwt.sign(payload, getJwtSecret(), options);

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

const signRefreshToken = (userId) =>
  jwt.sign({ _id: String(userId), jti: crypto.randomUUID() }, getRefreshSecret(), {
    expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  });

const verifyRefreshToken = (token) => jwt.verify(token, getRefreshSecret());

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

module.exports = {
  REFRESH_TOKEN_TTL_MS,
  getJwtSecret,
  signToken,
  verifyToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
};
