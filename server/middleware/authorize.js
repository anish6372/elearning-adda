// Role check; must run after the authenticate middleware.
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };

// Ensures a route param (e.g. :userId) belongs to the logged-in user.
const requireSelf =
  (param) =>
  (req, res, next) => {
    if (String(req.params[param]) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own data",
      });
    }
    next();
  };

// Overwrites a body field with the logged-in user's id so clients cannot act as someone else.
const bindBodyUser =
  (field = "userId") =>
  (req, res, next) => {
    req.body = { ...req.body, [field]: String(req.user._id) };
    next();
  };

module.exports = { authorize, requireSelf, bindBodyUser };
