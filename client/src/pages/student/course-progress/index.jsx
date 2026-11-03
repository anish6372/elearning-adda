import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import VideoPlayer from "@/components/video-player";
import { AuthContext } from "@/context/auth-context";
import { StudentContext } from "@/context/student-context";
import { loadLectureNote, saveLectureNote } from "@/lib/lecture-notes";
import {
  getCurrentCourseProgressService,
  markLectureAsViewedService,
  resetCourseProgressService,
  generateCertificateService,
  saveLecturePositionService,
} from "@/services";
import CourseDiscussion from "@/components/course-discussion";
import { useSocket } from "@/context/socket-context";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronLeft, ChevronRight, NotebookPen, Play, Users } from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import WhatsAppNotifyModal from "@/components/common/WhatsAppNotifyModal";
import { useNavigate, useParams } from "react-router-dom";
import { AICourseAssistantWidget } from "@/components/AICourseAssistantWidget";

function StudentViewCourseProgressPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { studentCurrentCourseProgress, setStudentCurrentCourseProgress } =
    useContext(StudentContext);
  const [lockCourse, setLockCourse] = useState(false);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [showCourseCompleteDialog, setShowCourseCompleteDialog] =
    useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSideBarOpen, setIsSideBarOpen] = useState(true);
  const [note, setNote] = useState("");
  const [activeLearners, setActiveLearners] = useState(0);
  const { id } = useParams();
  const socket = useSocket();
  // Latest saved position per lecture, so switching back and forth resumes correctly
  const positionsRef = useRef({});

  const curriculum =
    studentCurrentCourseProgress?.courseDetails?.curriculum || [];
  const viewedCount =
    studentCurrentCourseProgress?.progress?.filter((item) => item.viewed)
      ?.length || 0;
  const progressPercent = curriculum.length
    ? Math.round((viewedCount / curriculum.length) * 100)
    : 0;

  async function fetchCurrentCourseProgress() {
    const response = await getCurrentCourseProgressService(auth?.user?._id, id);
    if (response?.success) {
      if (!response?.data?.isPurchased) {
        setLockCourse(true);
      } else {
        setStudentCurrentCourseProgress({
          courseDetails: response?.data?.courseDetails,
          progress: response?.data?.progress,
        });

        if (response?.data?.completed) {
          setCurrentLecture(response?.data?.courseDetails?.curriculum[0]);
          setShowCourseCompleteDialog(true);
          setShowConfetti(true);
          // Auto-generate certificate
          generateCertificateService(auth?.user?._id, id).catch(() => {});
          return;
        }

        if (response?.data?.progress?.length === 0) {
          setCurrentLecture(response?.data?.courseDetails?.curriculum[0]);
        } else {
          const lastIndexOfViewedAsTrue = response?.data?.progress.reduceRight(
            (acc, obj, index) => {
              return acc === -1 && obj.viewed ? index : acc;
            },
            -1
          );

          setCurrentLecture(
            response?.data?.courseDetails?.curriculum[
              lastIndexOfViewedAsTrue + 1
            ] || response?.data?.courseDetails?.curriculum[0]
          );
        }
      }
    }
  }

  async function updateCourseProgress() {
    if (currentLecture) {
      const response = await markLectureAsViewedService(
        auth?.user?._id,
        studentCurrentCourseProgress?.courseDetails?._id,
        currentLecture._id
      );

      if (response?.success) {
        fetchCurrentCourseProgress();
      }
    }
  }

  async function handleRewatchCourse() {
    const response = await resetCourseProgressService(
      auth?.user?._id,
      studentCurrentCourseProgress?.courseDetails?._id
    );

    if (response?.success) {
      setCurrentLecture(null);
      setShowConfetti(false);
      setShowCourseCompleteDialog(false);
      fetchCurrentCourseProgress();
    }
  }

  useEffect(() => {
    fetchCurrentCourseProgress();
  }, [id]);

  // Real-time room for this course: live learner count + new lecture alerts
  useEffect(() => {
    if (!socket || !id) return undefined;
    const join = () => socket.emit("course:join", { courseId: id });
    const onPresence = ({ courseId, count }) => {
      if (courseId === id) setActiveLearners(count);
    };
    const onLectureAdded = (payload) => {
      toast({ title: "New content", description: payload.message });
      fetchCurrentCourseProgress();
    };

    join();
    socket.on("connect", join); // rejoin after a reconnect
    socket.on("course:presence", onPresence);
    socket.on("course:lecture-added", onLectureAdded);
    return () => {
      socket.emit("course:leave", { courseId: id });
      socket.off("connect", join);
      socket.off("course:presence", onPresence);
      socket.off("course:lecture-added", onLectureAdded);
    };
  }, [socket, id]);

  function handlePositionChange(seconds) {
    if (!currentLecture?._id) return;
    positionsRef.current[currentLecture._id] = seconds;
    saveLecturePositionService(auth?.user?._id, id, currentLecture._id, seconds).catch(() => {});
  }

  const resumeAt =
    positionsRef.current[currentLecture?._id] ??
    studentCurrentCourseProgress?.progress?.find((item) => item.lectureId === currentLecture?._id)
      ?.position ??
    0;

  useEffect(() => {
    if (currentLecture?.progressValue === 1) updateCourseProgress();
  }, [currentLecture]);

  useEffect(() => {
    if (showConfetti) setTimeout(() => setShowConfetti(false), 15000);
  }, [showConfetti]);

  useEffect(() => {
    setNote(
      loadLectureNote(
        auth?.user?._id,
        studentCurrentCourseProgress?.courseDetails?._id,
        currentLecture?._id
      )
    );
  }, [
    auth?.user?._id,
    studentCurrentCourseProgress?.courseDetails?._id,
    currentLecture?._id,
  ]);

  const lectureTitle = useMemo(
    () => currentLecture?.title || "Select a lecture",
    [currentLecture]
  );

  return (
    <div className="flex h-screen flex-col bg-[#0f1115] text-white">
      {showConfetti && <Confetti />}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex min-w-0 items-center space-x-4">
          <Button
            onClick={() => navigate("/student-courses")}
            className="text-white hover:bg-white/10"
            variant="ghost"
            size="sm"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            My learning
          </Button>
          <div className="min-w-0">
            <h1 className="hidden truncate text-lg font-bold md:block">
              {studentCurrentCourseProgress?.courseDetails?.title}
            </h1>
            <p className="hidden text-xs text-slate-400 md:block">
              {progressPercent}% complete · {viewedCount}/{curriculum.length} lectures
              {activeLearners > 0 && (
                <span className="ml-3 inline-flex items-center gap-1 text-emerald-400">
                  <Users className="h-3 w-3" /> {activeLearners} learning now
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsSideBarOpen(!isSideBarOpen)}
        >
          {isSideBarOpen ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex-1 ${
            isSideBarOpen ? "mr-[400px]" : ""
          } transition-all duration-300`}
        >
          <VideoPlayer
            width="100%"
            height="500px"
            url={currentLecture?.videoUrl}
            onProgressUpdate={setCurrentLecture}
            progressData={currentLecture}
            startAt={resumeAt}
            onPositionChange={handlePositionChange}
          />
          <div className="p-6">
            <h2 className="text-2xl font-bold">{lectureTitle}</h2>
          </div>
        </div>
        <div
          className={`fixed bottom-0 right-0 top-[73px] w-[400px] border-l border-white/10 bg-[#14161c] transition-all duration-300 ${
            isSideBarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <Tabs defaultValue="content" className="flex h-full flex-col">
            <TabsList className="grid h-14 w-full grid-cols-4 rounded-none bg-[#14161c] p-0">
              <TabsTrigger value="content" className="h-full rounded-none">
                Content
              </TabsTrigger>
              <TabsTrigger value="overview" className="h-full rounded-none">
                Overview
              </TabsTrigger>
              <TabsTrigger value="notes" className="h-full rounded-none">
                Notes
              </TabsTrigger>
              <TabsTrigger value="qa" className="h-full rounded-none">
                Q&amp;A
              </TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-4">
                  {curriculum.map((item, index) => {
                    const viewed = studentCurrentCourseProgress?.progress?.find(
                      (progressItem) => progressItem.lectureId === item._id
                    )?.viewed;
                    const active = currentLecture?._id === item._id;
                    return (
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                          active ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                        key={item._id}
                        onClick={() => setCurrentLecture(item)}
                      >
                        {viewed ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span>
                          {index + 1}. {item?.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="overview" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <h2 className="mb-4 text-xl font-bold">About this course</h2>
                  <p className="text-slate-400">
                    {studentCurrentCourseProgress?.courseDetails?.description}
                  </p>
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="qa" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <CourseDiscussion courseId={id} lectureId={currentLecture?._id} />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="notes" className="mt-0 flex-1 overflow-hidden p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <NotebookPen className="h-4 w-4" />
                Private notes for this lecture
              </div>
              <Textarea
                value={note}
                onChange={(event) => {
                  const value = event.target.value;
                  setNote(value);
                  saveLectureNote(
                    auth?.user?._id,
                    studentCurrentCourseProgress?.courseDetails?._id,
                    currentLecture?._id,
                    value
                  );
                }}
                placeholder="Capture takeaways, code snippets, or questions..."
                className="h-[70%] resize-none border-white/10 bg-black/30 text-white"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog open={lockCourse}>
        <DialogContent className="sm:w-[425px]">
          <DialogHeader>
            <DialogTitle>Course locked</DialogTitle>
            <DialogDescription>
              Purchase this course to access the player and lecture notes.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog open={showCourseCompleteDialog}>
        <DialogContent showOverlay={false} className="sm:w-[425px]">
          <DialogHeader>
            <DialogTitle>Congratulations!</DialogTitle>
            <DialogDescription className="flex flex-col gap-3">
              <Label>You have completed the course</Label>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/student-courses")}>
                  My learning
                </Button>
                <Button onClick={handleRewatchCourse}>Rewatch</Button>
                <Button variant="outline" onClick={() => navigate("/certificates")}>
                  🏆 View Certificate
                </Button>
                <WhatsAppNotifyModal
                  type="certificate"
                  courseData={{
                    title: studentCurrentCourseProgress?.courseDetails?.title,
                    courseId: id,
                  }}
                />
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <AICourseAssistantWidget courseId={id} lectureTitle={currentLecture?.title} />
    </div>
  );
}

export default StudentViewCourseProgressPage;
