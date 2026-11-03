import axiosInstance from "@/api/axiosInstance";

export async function registerService(formData) {
  const { data } = await axiosInstance.post("/auth/register", {
    ...formData,
    role: formData.role || "user",
  });

  return data;
}


export async function loginService(formData) {
  const { data } = await axiosInstance.post("/auth/login", formData);

  return data;
}

export async function googleAuthService(credential, role = "user") {
  const { data } = await axiosInstance.post("/auth/google", { credential, role });
  return data;
}

export async function setup2FAService() {
  const { data } = await axiosInstance.post("/auth/2fa/setup");
  return data;
}

export async function verifyEnable2FAService(token) {
  const { data } = await axiosInstance.post("/auth/2fa/verify-enable", { token });
  return data;
}

export async function validate2FAService(userId, token) {
  const { data } = await axiosInstance.post("/auth/2fa/validate", { userId, token });
  return data;
}

export async function disable2FAService() {
  const { data } = await axiosInstance.post("/auth/2fa/disable");
  return data;
}

export async function logoutService() {
  try {
    await axiosInstance.post("/auth/logout");
  } catch (e) {
    // the local session is cleared regardless
  }
}

export async function checkAuthService() {
  const { data } = await axiosInstance.get("/auth/check-auth");

  return data;
}


export async function mediaUploadService(formData, onProgressCallback) {
  const { data } = await axiosInstance.post("/media/upload", formData, {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgressCallback(percentCompleted);
    },
  });

  return data;
}

export async function mediaDeleteService(id) {
  const { data } = await axiosInstance.delete(`/media/delete/${id}`);

  return data;
}

export async function fetchInstructorCourseListService() {
  const { data } = await axiosInstance.get(`/instructor/course/get`);

  return data;
}

export async function addNewCourseService(formData) {
  const { data } = await axiosInstance.post(`/instructor/course/add`, formData);

  return data;
}

export async function fetchInstructorCourseDetailsService(id) {
  const { data } = await axiosInstance.get(
    `/instructor/course/get/details/${id}`
  );

  return data;
}

export async function updateCourseByIdService(id, formData) {
  const { data } = await axiosInstance.put(
    `/instructor/course/update/${id}`,
    formData
  );

  return data;
}

export async function mediaBulkUploadService(formData, onProgressCallback) {
  const { data } = await axiosInstance.post("/media/bulk-upload", formData, {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgressCallback(percentCompleted);
    },
  });

  return data;
}

export async function fetchStudentViewCourseListService(query) {
  const qs = query ? String(query) : "";
  const { data } = await axiosInstance.get(
    `/student/course/get${qs ? `?${qs}` : ""}`
  );

  return data;
}

export async function fetchStudentViewCourseDetailsService(courseId) {
  const { data } = await axiosInstance.get(
    `/student/course/get/details/${courseId}`
  );

  return data;
}

export async function checkCoursePurchaseInfoService(courseId, studentId) {
  const { data } = await axiosInstance.get(
    `/student/course/purchase-info/${courseId}/${studentId}`
  );

  return data;
}

export async function createPaymentService(formData) {
  const { data } = await axiosInstance.post(`/student/order/create`, formData);

  return data;
}

export async function captureAndFinalizePaymentService(
  paymentId,
  payerId,
  orderId
) {
  const { data } = await axiosInstance.post(`/student/order/capture`, {
    paymentId,
    payerId,
    orderId,
  });

  return data;
}

export async function fetchStudentBoughtCoursesService(studentId) {
  const { data } = await axiosInstance.get(
    `/student/courses-bought/get/${studentId}`
  );

  return data;
}

export async function fetchStudentProgressSummaryService(studentId) {
  const { data } = await axiosInstance.get(
    `/student/course-progress/summary/${studentId}`
  );

  return data;
}

export async function getCurrentCourseProgressService(userId, courseId) {
  const { data } = await axiosInstance.get(
    `/student/course-progress/get/${userId}/${courseId}`
  );

  return data;
}

export async function markLectureAsViewedService(userId, courseId, lectureId) {
  const { data } = await axiosInstance.post(
    `/student/course-progress/mark-lecture-viewed`,
    {
      userId,
      courseId,
      lectureId,
    }
  );

  return data;
}

export async function resetCourseProgressService(userId, courseId) {
  const { data } = await axiosInstance.post(
    `/student/course-progress/reset-progress`,
    {
      userId,
      courseId,
    }
  );

  return data;
}

// ─── Reviews ─────────────────────────────────────────────
export async function addReviewService(formData) {
  const { data } = await axiosInstance.post("/reviews/add", formData);
  return data;
}

export async function getCourseReviewsService(courseId) {
  const { data } = await axiosInstance.get(`/reviews/${courseId}`);
  return data;
}

// ─── Certificates ────────────────────────────────────────
export async function generateCertificateService(userId, courseId) {
  const { data } = await axiosInstance.post("/certificates/generate", { userId, courseId });
  return data;
}

export async function getUserCertificatesService(userId) {
  const { data } = await axiosInstance.get(`/certificates/user/${userId}`);
  return data;
}

export async function verifyCertificateService(certificateId) {
  const { data } = await axiosInstance.get(`/certificates/verify/${certificateId}`);
  return data;
}

export async function getCourseCertificateService(userId, courseId) {
  const { data } = await axiosInstance.get(`/certificates/course/${userId}/${courseId}`);
  return data;
}

// ─── WhatsApp Notifications ──────────────────────────────
export async function sendWhatsAppNotificationService(payload) {
  const { data } = await axiosInstance.post("/whatsapp/send", payload);
  return data;
}

// ─── Job Board & Placement Assessment ───────────────────
export async function fetchJobsService() {
  const { data } = await axiosInstance.get("/jobs");
  return data;
}

export async function createJobService(formData) {
  const { data } = await axiosInstance.post("/jobs/create", formData);
  return data;
}

export async function applyJobService(payload) {
  const { data } = await axiosInstance.post("/jobs/apply", payload);
  return data;
}

export async function submitPlacementAssessmentService(payload) {
  const { data } = await axiosInstance.post("/jobs/assessment/submit", payload);
  return data;
}

export async function checkPlacementEligibilityService(userId) {
  const { data } = await axiosInstance.get(`/jobs/eligibility/${userId}`);
  return data;
}




export async function saveLecturePositionService(userId, courseId, lectureId, position) {
  const { data } = await axiosInstance.post("/student/course-progress/position", {
    userId,
    courseId,
    lectureId,
    position,
  });
  return data;
}

export async function fetchInstructorAnalyticsService() {
  const { data } = await axiosInstance.get("/instructor/course/analytics");
  return data;
}

export async function fetchDiscussionsService(courseId, cursor) {
  const { data } = await axiosInstance.get(`/discussions/${courseId}`, {
    params: { limit: 10, ...(cursor && { cursor }) },
  });
  return data;
}

export async function addDiscussionQuestionService(courseId, text, lectureId) {
  const { data } = await axiosInstance.post(`/discussions/${courseId}`, { text, lectureId });
  return data;
}

export async function addDiscussionAnswerService(courseId, questionId, text) {
  const { data } = await axiosInstance.post(`/discussions/${courseId}/${questionId}/answers`, { text });
  return data;
}
