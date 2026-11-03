import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { courseCurriculumInitialFormData } from "@/config";
import { InstructorContext } from "@/context/instructor-context";
import { toast } from "@/hooks/use-toast";
import { isLectureReady, moveItem } from "@/lib/course-builder";
import {
  mediaBulkUploadService,
  mediaDeleteService,
  mediaUploadService,
} from "@/services";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Film,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useContext, useRef, useState } from "react";

const emptyLecture = () => ({ ...courseCurriculumInitialFormData[0] });

// Drop target + file picker for a single lecture video
function VideoDropzone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file && !disabled) onFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
        dragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/60 hover:bg-slate-50"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <UploadCloud className="h-7 w-7 text-primary" />
      <span className="text-sm font-medium text-slate-700">Drag &amp; drop a video, or click to browse</span>
      <span className="text-xs text-muted-foreground">MP4, MOV or WebM</span>
      <input
        type="file"
        accept="video/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function CourseCurriculum() {
  const {
    courseCurriculumFormData,
    setCourseCurriculumFormData,
    mediaUploadProgress,
    setMediaUploadProgress,
    mediaUploadProgressPercentage,
    setMediaUploadProgressPercentage,
  } = useContext(InstructorContext);

  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const bulkUploadInputRef = useRef(null);

  const lectures = courseCurriculumFormData;
  const readyCount = lectures.filter(isLectureReady).length;
  const previewCount = lectures.filter((l) => l.freePreview).length;

  // Functional updates so an upload finishing late never overwrites newer edits
  function updateLecture(index, patch) {
    setCourseCurriculumFormData((prev) =>
      prev.map((lecture, i) => (i === index ? { ...lecture, ...patch } : lecture))
    );
  }

  function handleAddLecture() {
    setCourseCurriculumFormData((prev) => [...prev, emptyLecture()]);
  }

  async function handleSingleLectureUpload(file, index) {
    const videoFormData = new FormData();
    videoFormData.append("file", file);

    setUploadingIndex(index);
    setMediaUploadProgress(true);
    setMediaUploadProgressPercentage(0);
    try {
      const response = await mediaUploadService(videoFormData, setMediaUploadProgressPercentage);
      if (response?.success) {
        updateLecture(index, {
          videoUrl: response.data.url,
          public_id: response.data.public_id,
          // Name the lecture after the file if the instructor has not typed a title yet
          ...(!lectures[index]?.title && { title: file.name.replace(/\.[^.]+$/, "") }),
        });
      }
    } catch {
      toast({ title: "Upload failed", description: "Please try the video again.", variant: "destructive" });
    } finally {
      setMediaUploadProgress(false);
      setUploadingIndex(null);
    }
  }

  async function handleReplaceVideo(index) {
    const publicId = lectures[index]?.public_id;
    if (publicId) await mediaDeleteService(publicId).catch(() => {});
    updateLecture(index, { videoUrl: "", public_id: "" });
  }

  async function handleDeleteLecture(index) {
    const publicId = lectures[index]?.public_id;
    setPendingDelete(null);
    // Removing the video from storage is best effort; the lecture is removed either way
    if (publicId) await mediaDeleteService(publicId).catch(() => {});
    setCourseCurriculumFormData((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyLecture()];
    });
  }

  async function handleMediaBulkUpload(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const bulkFormData = new FormData();
    selectedFiles.forEach((fileItem) => bulkFormData.append("files", fileItem));

    setMediaUploadProgress(true);
    setMediaUploadProgressPercentage(0);
    try {
      const response = await mediaBulkUploadService(bulkFormData, setMediaUploadProgressPercentage);
      if (response?.success) {
        setCourseCurriculumFormData((prev) => {
          // Drop the blank starter lecture instead of leaving it above the uploaded ones
          const kept = prev.filter((l) => l.title || l.videoUrl);
          return [
            ...kept,
            ...response.data.map((item, index) => ({
              videoUrl: item?.url,
              public_id: item?.public_id,
              title: selectedFiles[index]?.name.replace(/\.[^.]+$/, "") || `Lecture ${kept.length + index + 1}`,
              freePreview: false,
            })),
          ];
        });
        toast({ title: `${response.data.length} lectures added` });
      }
    } catch {
      toast({ title: "Bulk upload failed", description: "Up to 10 videos per upload.", variant: "destructive" });
    } finally {
      setMediaUploadProgress(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Curriculum</h2>
          <p className="text-sm text-muted-foreground">
            {lectures.length} lecture{lectures.length === 1 ? "" : "s"} · {readyCount} ready ·{" "}
            {previewCount} free preview
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={bulkUploadInputRef}
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleMediaBulkUpload}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={mediaUploadProgress}
            onClick={() => bulkUploadInputRef.current?.click()}
          >
            <UploadCloud className="h-4 w-4" /> Bulk upload videos
          </Button>
        </div>
      </div>

      {mediaUploadProgress && uploadingIndex === null && (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Uploading videos
            </span>
            <span className="text-muted-foreground">{mediaUploadProgressPercentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${mediaUploadProgressPercentage}%` }} />
          </div>
        </div>
      )}

      <ol className="space-y-4">
        {lectures.map((lecture, index) => {
          const ready = isLectureReady(lecture);
          const uploading = uploadingIndex === index;
          return (
            <li
              key={lecture._id || lecture.public_id || `new-${index}`}
              className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  {ready ? (
                    <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </Badge>
                  ) : (
                    <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                      <Clock className="h-3 w-3" /> {lecture.videoUrl ? "Needs title" : "Needs video"}
                    </Badge>
                  )}
                </div>
                <Input
                  aria-label={`Lecture ${index + 1} title`}
                  placeholder="e.g. Introduction to Node.js streams"
                  className="sm:flex-1"
                  value={lecture.title}
                  onChange={(event) => updateLecture(index, { title: event.target.value })}
                />
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`freePreview-${index}`}
                      checked={lecture.freePreview}
                      onCheckedChange={(value) => updateLecture(index, { freePreview: value })}
                    />
                    <Label htmlFor={`freePreview-${index}`} className="whitespace-nowrap text-sm">
                      Free preview
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Move lecture up"
                      disabled={index === 0}
                      onClick={() => setCourseCurriculumFormData((prev) => moveItem(prev, index, index - 1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Move lecture down"
                      disabled={index === lectures.length - 1}
                      onClick={() => setCourseCurriculumFormData((prev) => moveItem(prev, index, index + 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete lecture"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setPendingDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {pendingDelete === index && (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-red-700">Delete this lecture and its video? This cannot be undone.</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPendingDelete(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteLecture(index)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4">
                {lecture.videoUrl ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <video
                      src={lecture.videoUrl}
                      controls
                      preload="metadata"
                      className="aspect-video w-full rounded-lg bg-slate-900 sm:w-72"
                    />
                    <div className="flex flex-col gap-2 text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <Film className="h-4 w-4 text-primary" /> Video uploaded
                      </span>
                      <Button variant="outline" size="sm" className="w-fit gap-2" onClick={() => handleReplaceVideo(index)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Replace video
                      </Button>
                    </div>
                  </div>
                ) : uploading ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading video
                      </span>
                      <span className="text-muted-foreground">{mediaUploadProgressPercentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${mediaUploadProgressPercentage}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <VideoDropzone disabled={mediaUploadProgress} onFile={(file) => handleSingleLectureUpload(file, index)} />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={handleAddLecture}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add lecture
      </button>
    </div>
  );
}

export default CourseCurriculum;
