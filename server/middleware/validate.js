const { z } = require("zod");

// validate(schema) parses req.body and replaces it with the cleaned data
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error.issues[0]?.message || "Invalid request",
      errors: result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

const registerSchema = z.object({
  userName: z.string().trim().min(2, "User name must be at least 2 characters").max(50),
  userEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  role: z.string().optional(),
});

const loginSchema = z.object({
  userEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const reviewSchema = z.object({
  courseId: z.string().min(1, "courseId is required"),
  userId: z.string().min(1),
  userName: z.string().optional(),
  rating: z.coerce.number().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
});

const courseSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    pricing: z.coerce.number().min(0, "Pricing cannot be negative").optional(),
  })
  .passthrough();

const coursePatchSchema = courseSchema.partial();

const discussionSchema = z.object({
  text: z.string().trim().min(1, "Message cannot be empty").max(2000),
  lectureId: z.string().optional(),
});

const lecturePositionSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  lectureId: z.string().min(1),
  position: z.coerce.number().min(0),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  reviewSchema,
  courseSchema,
  coursePatchSchema,
  discussionSchema,
  lecturePositionSchema,
};
