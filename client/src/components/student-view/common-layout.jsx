import { Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentViewCommonHeader from "./header";
import StudentViewFooter from "./footer";
import { AICourseAssistantWidget } from "@/components/AICourseAssistantWidget";

function StudentViewCommonLayout() {
  const location = useLocation();
  const isPlayer = location.pathname.includes("course-progress");

  return (
    <div className="flex min-h-screen flex-col relative">
      {!isPlayer ? <StudentViewCommonHeader /> : null}
      <div className="flex-1">
        {/* Keeps header/footer visible while a lazy page chunk loads */}
        <Suspense fallback={<Skeleton className="m-8 h-64" />}>
          <Outlet />
        </Suspense>
      </div>
      {!isPlayer ? <StudentViewFooter /> : null}
      <AICourseAssistantWidget />
    </div>
  );
}

export default StudentViewCommonLayout;

