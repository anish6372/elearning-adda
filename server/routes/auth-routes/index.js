const express = require("express");
const {
  registerUser,
  loginUser,
  googleAuth,
  setup2FA,
  verifyEnable2FA,
  validate2FA,
  disable2FA,
  refreshSession,
  logoutUser,
} = require("../../controllers/auth-controller/index");
const authenticateMiddleware = require("../../middleware/auth-middleware");
const { validate, registerSchema, loginSchema } = require("../../middleware/validate");
const router = express.Router();

router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/google", googleAuth);
router.post("/refresh", refreshSession);
router.post("/logout", logoutUser);

// 2FA Routes
router.post("/2fa/setup", authenticateMiddleware, setup2FA);
router.post("/2fa/verify-enable", authenticateMiddleware, verifyEnable2FA);
router.post("/2fa/validate", validate2FA);
router.post("/2fa/disable", authenticateMiddleware, disable2FA);

router.get("/check-auth", authenticateMiddleware, (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    message: "Authenticated user!",
    data: {
      user,
    },
  });
});

module.exports = router;

