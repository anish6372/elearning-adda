import { Route, Routes } from "react-router-dom";
import { lazy, Suspense, useContext } from "react";
import RouteGuard from "./components/route-guard";
import { AuthContext } from "./context/auth-context";
import StudentViewCommonLayout from "./components/student-view/common-layout";
import { Toaster } from "./components/ui/toaster";
import { Skeleton } from "./components/ui/skeleton";

// Route-level code splitting: each page is its own chunk, loaded on first visit
const AuthPage = lazy(() => import("./pages/auth"));
const InstructorDashboardpage = lazy(() => import("./pages/instructor"));
const StudentHomePage = lazy(() => import("./pages/student/home"));
const NotFoundPage = lazy(() => import("./pages/not-found"));
const AddNewCoursePage = lazy(() => import("./pages/instructor/add-new-course"));
const StudentViewCoursesPage = lazy(() => import("./pages/student/courses"));
const StudentViewCourseDetailsPage = lazy(() => import("./pages/student/course-details"));
const PaypalPaymentReturnPage = lazy(() => import("./pages/student/payment-return"));
const StudentCoursesPage = lazy(() => import("./pages/student/student-courses"));
const StudentViewCourseProgressPage = lazy(() => import("./pages/student/course-progress"));
const CheckoutPage = lazy(() => import("./pages/student/checkout"));
const CertificatesPage = lazy(() => import("./pages/student/certificates"));
const CertificateVerifyPage = lazy(() => import("./pages/student/certificate-verify"));
const StudentJobsPage = lazy(() => import("./pages/student/jobs"));

function PageFallback() {
  return (
    <div className="page-wrap space-y-4 py-10">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function App() {
  const { auth } = useContext(AuthContext);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route
          path="/auth"
          element={
            <RouteGuard
              element={<AuthPage />}
              authenticated={auth?.authenticate}
              user={auth?.user}
            />
          }
        />
        <Route
          path="/instructor"
          element={
            <RouteGuard
              element={<InstructorDashboardpage />}
              authenticated={auth?.authenticate}
              user={auth?.user}
            />
          }
        />
        <Route
          path="/instructor/create-new-course"
          element={
            <RouteGuard
              element={<AddNewCoursePage />}
              authenticated={auth?.authenticate}
              user={auth?.user}
            />
          }
        />
        <Route
          path="/instructor/edit-course/:courseId"
          element={
            <RouteGuard
              element={<AddNewCoursePage />}
              authenticated={auth?.authenticate}
              user={auth?.user}
            />
          }
        />
        <Route
          path="/"
          element={
            <RouteGuard
              element={<StudentViewCommonLayout />}
              authenticated={auth?.authenticate}
              user={auth?.user}
            />
          }
        >
          <Route path="" element={<StudentHomePage />} />
          <Route path="home" element={<StudentHomePage />} />
          <Route path="courses" element={<StudentViewCoursesPage />} />
          <Route
            path="course/details/:id"
            element={<StudentViewCourseDetailsPage />}
          />
          <Route path="payment-return" element={<PaypalPaymentReturnPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="student-courses" element={<StudentCoursesPage />} />
          <Route
            path="course-progress/:id"
            element={<StudentViewCourseProgressPage />}
          />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="certificate-verify/:certificateId" element={<CertificateVerifyPage />} />
          <Route path="jobs" element={<StudentJobsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </Suspense>
  );
}

export default App;
