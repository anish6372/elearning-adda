const { sendReceiptEmail } = require("../../helpers/queue");
const { invalidateCache } = require("../../helpers/redis");
const { emitToUsers } = require("../../helpers/socket");
const mongoose = require("mongoose");
const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Course = require("../../models/Course");
const StudentCourses = require("../../models/StudentCourses");

const createOrder = async (req, res) => {
  try {
    const { userId, orderDate, paymentId, payerId, courseId } = req.body;

    // Price, title and instructor come from the database, never from the client
    const course = mongoose.isValidObjectId(courseId) ? await Course.findById(courseId).lean() : null;
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if ((course.students || []).some((s) => s.studentId === userId)) {
      return res.status(409).json({ success: false, message: "You already own this course" });
    }

    const userName = req.user.userName;
    const userEmail = req.user.userEmail;
    const orderStatus = "pending";
    const paymentMethod = "paypal";
    const paymentStatus = "initiated";
    const instructorId = course.instructorId;
    const instructorName = course.instructorName;
    const courseImage = course.image;
    const courseTitle = course.title;
    const coursePricing = Number(course.pricing) || 0;

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `${process.env.CLIENT_URL}/payment-return`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: courseTitle,
                sku: courseId,
                price: coursePricing.toFixed(2),
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: coursePricing.toFixed(2),
          },
          description: courseTitle,
        },
      ],
    };

    const newlyCreatedCourseOrder = new Order({
      userId,
      userName,
      userEmail,
      orderStatus,
      paymentMethod,
      paymentStatus,
      orderDate: orderDate || new Date(),
      paymentId,
      payerId,
      instructorId,
      instructorName,
      courseImage,
      courseTitle,
      courseId,
      coursePricing,
    });

    await newlyCreatedCourseOrder.save();

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET_ID) {
      // Demo / Direct purchase fallback mode when PayPal API credentials are not set
      const mockApproveUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/checkout?orderId=${newlyCreatedCourseOrder._id}&courseTitle=${encodeURIComponent(courseTitle)}&coursePricing=${coursePricing}&courseImage=${encodeURIComponent(courseImage || "")}`;
      return res.status(201).json({
        success: true,
        data: {
          approveUrl: mockApproveUrl,
          orderId: newlyCreatedCourseOrder._id,
        },
      });
    }

    paypal.payment.create(create_payment_json, async (error, paymentInfo) => {
      if (error) {
        console.log("PayPal API error, using direct checkout fallback:", error);
        const fallbackApproveUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/checkout?orderId=${newlyCreatedCourseOrder._id}&courseTitle=${encodeURIComponent(courseTitle)}&coursePricing=${coursePricing}&courseImage=${encodeURIComponent(courseImage || "")}`;
        return res.status(201).json({
          success: true,
          data: {
            approveUrl: fallbackApproveUrl,
            orderId: newlyCreatedCourseOrder._id,
          },
        });
      } else {
        const approveUrl = paymentInfo.links.find(
          (link) => link.rel == "approval_url"
        ).href;

        // Lets the PayPal webhook find this order by payment id
        newlyCreatedCourseOrder.paymentId = paymentInfo.id;
        await newlyCreatedCourseOrder.save();

        res.status(201).json({
          success: true,
          data: {
            approveUrl,
            orderId: newlyCreatedCourseOrder._id,
          },
        });
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const isPaypalConfigured = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET_ID);

const executePaypalPayment = (paymentId, payerId) =>
  new Promise((resolve, reject) =>
    paypal.payment.execute(paymentId, { payer_id: payerId }, (error, payment) =>
      error ? reject(error) : resolve(payment)
    )
  );

// Idempotent: the pending -> paid transition is a single atomic update, so a double click,
// a client retry and the PayPal webhook can all call this and the student is enrolled once.
const finalizeOrder = async (orderId, { paymentId, payerId } = {}) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        orderStatus: "confirmed",
        ...(paymentId && { paymentId }),
        ...(payerId && { payerId }),
      },
    },
    { new: true }
  );

  if (!order) {
    return { order: await Order.findById(orderId), alreadyProcessed: true };
  }

  const enrolledCourse = {
    courseId: order.courseId,
    title: order.courseTitle,
    instructorId: order.instructorId,
    instructorName: order.instructorName,
    dateOfPurchase: order.orderDate,
    courseImage: order.courseImage,
  };

  // Two-step upsert: create the user's document if needed, then push only if not already enrolled
  await StudentCourses.updateOne(
    { userId: order.userId },
    { $setOnInsert: { userId: order.userId, courses: [] } },
    { upsert: true }
  );
  await StudentCourses.updateOne(
    { userId: order.userId, "courses.courseId": { $ne: order.courseId } },
    { $push: { courses: enrolledCourse } }
  );

  await Course.updateOne(
    { _id: order.courseId, "students.studentId": { $ne: order.userId } },
    {
      $push: {
        students: {
          studentId: order.userId,
          studentName: order.userName,
          studentEmail: order.userEmail,
          paidAmount: order.coursePricing,
        },
      },
    }
  );

  // Side effects run in the background (BullMQ when Redis is up) so checkout is not blocked
  sendReceiptEmail({
    email: order.userEmail,
    orderId: String(order._id),
    courseTitle: order.courseTitle,
    amount: order.coursePricing,
  });
  invalidateCache("courses:list:*");
  emitToUsers([order.instructorId], "notification", {
    type: "new-enrollment",
    message: `${order.userName} enrolled in ${order.courseTitle}`,
    courseId: order.courseId,
  });

  return { order, alreadyProcessed: false };
};

const capturePaymentAndFinalizeOrder = async (req, res) => {
  try {
    const { paymentId, payerId, orderId } = req.body;

    const order = mongoose.isValidObjectId(orderId) ? await Order.findById(orderId) : null;

    if (!order || order.userId !== String(req.user._id)) {
      return res.status(404).json({
        success: false,
        message: "Order can not be found",
      });
    }

    // With real PayPal credentials the payment is executed server side; the client's word is not enough
    if (isPaypalConfigured() && order.paymentStatus !== "paid") {
      try {
        const payment = await executePaypalPayment(paymentId, payerId);
        if (payment.state !== "approved") {
          return res.status(402).json({ success: false, message: "Payment was not approved" });
        }
      } catch (e) {
        console.log("PayPal execute error:", e.response || e.message);
        return res.status(402).json({ success: false, message: "Payment could not be completed" });
      }
    }

    const result = await finalizeOrder(orderId, { paymentId, payerId });

    res.status(200).json({
      success: true,
      message: result.alreadyProcessed ? "Order already confirmed" : "Order confirmed",
      data: result.order,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

module.exports = { createOrder, capturePaymentAndFinalizeOrder, finalizeOrder };
