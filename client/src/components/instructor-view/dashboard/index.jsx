import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Users,
  PlusCircle,
  Sparkles,
  ArrowUpRight,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AICurriculumGeneratorModal from "../AICurriculumGeneratorModal";
import { fetchInstructorAnalyticsService } from "@/services";
import RevenueChart from "./revenue-chart";

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

function InstructorDashboard({ listOfCourses = [] }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);

  // Totals come from server-side aggregations over paid orders, progress and reviews
  useEffect(() => {
    fetchInstructorAnalyticsService()
      .then((response) => response?.success && setAnalytics(response.data))
      .catch(() => {});
  }, [listOfCourses.length]);

  function calculateTotalStudentsAndProfit() {
    const { totalStudents, totalProfit, studentList, topCourse } =
      listOfCourses.reduce(
        (acc, course) => {
          const studentCount = course.students?.length || 0;
          const revenue = (course.pricing || 0) * studentCount;
          acc.totalStudents += studentCount;
          acc.totalProfit += revenue;

          if (revenue >= (acc.topCourse?.revenue || 0)) {
            acc.topCourse = { title: course.title, revenue, studentCount };
          }

          (course.students || []).forEach((student) => {
            acc.studentList.push({
              courseTitle: course.title,
              studentName: student.studentName,
              studentEmail: student.studentEmail,
            });
          });

          return acc;
        },
        {
          totalStudents: 0,
          totalProfit: 0,
          studentList: [],
          topCourse: null,
        }
      );

    return {
      totalProfit,
      totalStudents,
      studentList,
      topCourse,
    };
  }

  const stats = calculateTotalStudentsAndProfit();
  const thisMonth = analytics?.monthly?.[analytics.monthly.length - 1];
  const config = [
    {
      icon: Users,
      label: "Total Students",
      value: analytics?.totalStudents ?? stats.totalStudents,
      change: `${thisMonth?.sales || 0} new this month`,
      gradient: "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
      iconColor: "text-blue-500",
    },
    {
      icon: DollarSign,
      label: "Total Revenue",
      value: formatMoney(analytics?.totalRevenue ?? stats.totalProfit),
      change: `${formatMoney(thisMonth?.revenue)} this month`,
      gradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
      iconColor: "text-emerald-500",
    },
    {
      icon: BookOpen,
      label: "Published Courses",
      value: listOfCourses.length,
      change: "Active in catalog",
      gradient: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
      iconColor: "text-purple-500",
    },
    {
      icon: TrendingUp,
      label: "Top Course",
      value: analytics?.topCourse?.title || stats.topCourse?.title || "—",
      change: analytics?.topCourse
        ? `${formatMoney(analytics.topCourse.revenue)} revenue`
        : "No sales yet",
      gradient: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-indigo-900/30">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            Instructor Studio Dashboard <Sparkles className="h-5 w-5 text-amber-400" />
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Track student performance, course revenue analytics, and build AI-powered curriculums.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AICurriculumGeneratorModal />
          <Button
            onClick={() => navigate("/instructor/create-new-course")}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-900/20"
          >
            <PlusCircle className="h-4 w-4" /> Create Course
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.map((item) => (
          <Card key={item.label} className={`relative overflow-hidden border bg-gradient-to-br ${item.gradient} transition-all hover:shadow-lg`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {item.label}
              </CardTitle>
              <div className={`p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 shadow-sm ${item.iconColor}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="truncate text-2xl font-extrabold text-slate-900 dark:text-white">
                {item.value}
              </div>
              <div className="mt-1 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="mr-0.5 h-3 w-3" />
                {item.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Chart & Performance Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Analytics Visual Graph */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Revenue & Enrollment Growth</CardTitle>
              <p className="text-xs text-muted-foreground">Paid orders over the last 6 months</p>
            </div>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Last 6 months
            </span>
          </CardHeader>
          <CardContent className="pt-6">
            <RevenueChart monthly={analytics?.monthly || []} />
          </CardContent>
        </Card>

        {/* Quick Highlights Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" /> Platform Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Student Completion Rate</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {analytics ? `${analytics.completionRate}%` : "—"}
              </p>
              <p className="text-xs text-slate-500 font-medium">Of enrolled students who finished a course</p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Average Student Rating</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {analytics?.averageRating ? `${analytics.averageRating} ⭐` : "No ratings yet"}
                </span>
                <span className="text-xs text-slate-500">({analytics?.reviewCount || 0} reviews)</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Course Verification</span>
              <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                ✓ Auto Certificate & WhatsApp Enabled
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Enrollments Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-lg font-bold">Recent Student Enrollments</CardTitle>
            <p className="text-xs text-muted-foreground">Students enrolled across all active published courses</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableHead className="font-bold">Course Title</TableHead>
                  <TableHead className="font-bold">Student Name</TableHead>
                  <TableHead className="font-bold">Student Email</TableHead>
                  <TableHead className="font-bold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.studentList.length > 0 ? (
                  stats.studentList.map((studentItem, index) => (
                    <TableRow key={`${studentItem.studentEmail}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                      <TableCell className="font-semibold text-slate-900 dark:text-white">
                        {studentItem.courseTitle}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 font-bold text-xs">
                          {studentItem.studentName ? studentItem.studentName[0].toUpperCase() : "S"}
                        </div>
                        <span className="font-medium">{studentItem.studentName}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{studentItem.studentEmail}</TableCell>
                      <TableCell className="text-right">
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Active Learner
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No student enrollments recorded yet. Create and publish a course to start welcoming students!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InstructorDashboard;
