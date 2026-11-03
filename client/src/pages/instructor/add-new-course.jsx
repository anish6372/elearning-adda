import CourseCurriculum from "@/components/instructor-view/courses/add-new-course/course-curriculum";
import CourseLanding from "@/components/instructor-view/courses/add-new-course/course-landing";
import CourseSettings from "@/components/instructor-view/courses/add-new-course/course-settings";
import {
  CoursePreviewCard,
  PublishChecklist,
} from "@/components/instructor-view/courses/add-new-course/course-builder-sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  courseCurriculumInitialFormData,
  courseLandingInitialFormData,
} from "@/config";
import { AuthContext } from "@/context/auth-context";
import { InstructorContext } from "@/context/instructor-context";
import { toast } from "@/hooks/use-toast";
import { getCourseChecklist, isStepComplete } from "@/lib/course-builder";
import {
  addNewCourseService,
  fetchInstructorCourseDetailsService,
  updateCourseByIdService,
} from "@/services";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Image as ImageIcon,
  ListVideo,
  Loader2,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STEPS = [
  { id: "details", label: "Details", description: "Title, price & description", icon: FileText },
  { id: "curriculum", label: "Curriculum", description: "Lectures & videos", icon: ListVideo },
  { id: "media", label: "Thumbnail", description: "Course cover image", icon: ImageIcon },
  { id: "review", label: "Review", description: "Check & publish", icon: ShieldCheck },
];

const snapshot = (landing, curriculum) => JSON.stringify({ landing, curriculum });

function AddNewCoursePage() {
  const {
    courseLandingFormData,
    courseCurriculumFormData,
    setCourseLandingFormData,
    setCourseCurriculumFormData,
    currentEditedCourseId,
    setCurrentEditedCourseId,
    mediaUploadProgress,
  } = useContext(InstructorContext);
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const { courseId } = useParams();

  const isEditing = Boolean(courseId);
  const [step, setStep] = useState("details");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // What the form looked like when it was opened (or last loaded), to detect unsaved changes
  const savedSnapshotRef = useRef(snapshot(courseLandingInitialFormData, courseCurriculumInitialFormData));

  const checklist = useMemo(
    () => getCourseChecklist(courseLandingFormData, courseCurriculumFormData),
    [courseLandingFormData, courseCurriculumFormData]
  );
  const isDirty = snapshot(courseLandingFormData, courseCurriculumFormData) !== savedSnapshotRef.current;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function resetBuilder() {
    setCourseLandingFormData(courseLandingInitialFormData);
    setCourseCurriculumFormData(courseCurriculumInitialFormData);
    setCurrentEditedCourseId(null);
  }

  // Always start from a clean form, and clean up on the way out so stale data never leaks into the next course
  useEffect(() => {
    if (!isEditing) resetBuilder();
    return resetBuilder;
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setCurrentEditedCourseId(courseId);
    setLoading(true);
    fetchInstructorCourseDetailsService(courseId)
      .then((response) => {
        if (!response?.success) return;
        const landing = Object.keys(courseLandingInitialFormData).reduce((acc, key) => {
          acc[key] = response.data[key] ?? courseLandingInitialFormData[key];
          return acc;
        }, {});
        const curriculum = response.data.curriculum?.length ? response.data.curriculum : courseCurriculumInitialFormData;
        setCourseLandingFormData(landing);
        setCourseCurriculumFormData(curriculum);
        savedSnapshotRef.current = snapshot(landing, curriculum);
      })
      .catch(() => toast({ title: "Could not load this course", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [courseId]);

  // Browser-level guard for refresh / tab close with unsaved work
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function goBack() {
    if (isDirty) setConfirmLeave(true);
    else navigate("/instructor");
  }

  async function handlePublish() {
    if (!checklist.ready || saving) return;
    setSaving(true);
    const courseFinalFormData = {
      instructorId: auth?.user?._id,
      instructorName: auth?.user?.userName,
      date: new Date(),
      ...courseLandingFormData,
      students: [],
      curriculum: courseCurriculumFormData,
      isPublised: true,
    };

    try {
      const response = isEditing
        ? await updateCourseByIdService(currentEditedCourseId || courseId, courseFinalFormData)
        : await addNewCourseService(courseFinalFormData);

      if (response?.success) {
        savedSnapshotRef.current = snapshot(courseLandingFormData, courseCurriculumFormData);
        toast({
          title: isEditing ? "Changes saved" : "Course published 🎉",
          description: isEditing ? courseLandingFormData.title : `${courseLandingFormData.title} is now live.`,
        });
        navigate("/instructor");
      }
    } catch (error) {
      toast({
        title: "Could not save the course",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const publishLabel = isEditing ? "Save changes" : "Publish course";
  const missing = checklist.items.filter((i) => !i.done).map((i) => i.label);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Sticky header with back navigation and the primary action */}
      <header className="sticky top-0 z-30 border-b border-indigo-900/40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="gap-2 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to dashboard</span>
          </Button>
          <div className="min-w-0 flex-1 border-l border-white/10 pl-3">
            <h1 className="truncate text-base font-bold sm:text-lg">
              {isEditing ? courseLandingFormData.title || "Edit course" : "Create a new course"}
            </h1>
            <p className="text-xs text-slate-400">
              {isDirty ? "Unsaved changes" : isEditing ? "All changes saved" : "Fill in each step, then publish"}
            </p>
          </div>
          <Button
            onClick={handlePublish}
            disabled={!checklist.ready || saving || mediaUploadProgress}
            title={checklist.ready ? undefined : `Still needed: ${missing.join(", ")}`}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            <span className="hidden sm:inline">{publishLabel}</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Stepper */}
        <nav aria-label="Course builder steps" className="mb-6">
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, index) => {
              const done = s.id === "review" ? checklist.ready : isStepComplete(checklist, s.id);
              const active = s.id === step;
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl border p-2 text-left transition sm:p-3 ${
                      active
                        ? "border-primary bg-white shadow-md ring-2 ring-primary/15"
                        : "border-transparent bg-white/60 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "bg-primary text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="hidden min-w-0 md:block">
                      <span className="block text-xs font-semibold text-muted-foreground">Step {index + 1}</span>
                      <span className={`block truncate text-sm font-bold ${active ? "text-slate-900" : "text-slate-600"}`}>
                        {s.label}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={`grid gap-6 ${step === "review" ? "" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}>
          <main className="min-w-0">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {step === "details" && <CourseLanding />}
                {step === "curriculum" && <CourseCurriculum />}
                {step === "media" && <CourseSettings />}
                {step === "review" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Review &amp; publish</h2>
                      <p className="text-sm text-muted-foreground">
                        {checklist.ready
                          ? "Everything looks good. Your course is ready to go live."
                          : "Finish the remaining items, then publish."}
                      </p>
                    </div>
                    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:max-w-4xl">
                      <CoursePreviewCard
                        landing={courseLandingFormData}
                        curriculum={courseCurriculumFormData}
                        instructorName={auth?.user?.userName}
                      />
                      <PublishChecklist checklist={checklist} onGoToStep={setStep} />
                    </div>
                    <Button
                      size="lg"
                      onClick={handlePublish}
                      disabled={!checklist.ready || saving || mediaUploadProgress}
                      className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold text-white hover:from-indigo-600 hover:to-purple-700 sm:w-auto"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                      {publishLabel}
                    </Button>
                  </div>
                )}

                {/* Step navigation */}
                <div className="mt-8 flex items-center justify-between border-t pt-5">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => (stepIndex === 0 ? goBack() : setStep(STEPS[stepIndex - 1].id))}
                  >
                    <ArrowLeft className="h-4 w-4" /> {stepIndex === 0 ? "Cancel" : "Previous"}
                  </Button>
                  {stepIndex < STEPS.length - 1 && (
                    <Button className="gap-2" onClick={() => setStep(STEPS[stepIndex + 1].id)}>
                      Next: {STEPS[stepIndex + 1].label} <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </main>

          {/* Live preview + checklist, hidden on the review step where they are shown full size */}
          {step !== "review" && (
            <aside className="hidden space-y-4 lg:block">
              <div className="sticky top-24 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Live preview</p>
                <CoursePreviewCard
                  landing={courseLandingFormData}
                  curriculum={courseCurriculumFormData}
                  instructorName={auth?.user?.userName}
                />
                <PublishChecklist checklist={checklist} onGoToStep={setStep} />
              </div>
            </aside>
          )}
        </div>
      </div>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have changes that have not been {isEditing ? "saved" : "published"}. If you leave now they will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setConfirmLeave(false);
                navigate("/instructor");
              }}
            >
              Discard &amp; leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddNewCoursePage;
