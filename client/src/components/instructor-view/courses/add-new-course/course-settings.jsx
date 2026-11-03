import { Button } from "@/components/ui/button";
import { InstructorContext } from "@/context/instructor-context";
import { toast } from "@/hooks/use-toast";
import { mediaUploadService } from "@/services";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useContext, useRef, useState } from "react";

function CourseSettings() {
  const {
    courseLandingFormData,
    setCourseLandingFormData,
    mediaUploadProgress,
    setMediaUploadProgress,
    mediaUploadProgressPercentage,
    setMediaUploadProgressPercentage,
  } = useContext(InstructorContext);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function uploadImage(file) {
    if (!file?.type?.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    const imageFormData = new FormData();
    imageFormData.append("file", file);

    setMediaUploadProgress(true);
    setMediaUploadProgressPercentage(0);
    try {
      const response = await mediaUploadService(imageFormData, setMediaUploadProgressPercentage);
      if (response?.success) {
        setCourseLandingFormData((prev) => ({ ...prev, image: response.data.url }));
      }
    } catch {
      toast({ title: "Upload failed", description: "Please try the image again.", variant: "destructive" });
    } finally {
      setMediaUploadProgress(false);
    }
  }

  const image = courseLandingFormData?.image;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Course thumbnail</h2>
        <p className="text-sm text-muted-foreground">
          Shown on course cards and the course page. A 16:9 image of at least 1280×720 looks best.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          uploadImage(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {image ? (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <img src={image} alt="Course thumbnail" className="aspect-video w-full object-cover" />
          <div className="flex flex-wrap gap-2 p-4">
            <Button variant="outline" className="gap-2" disabled={mediaUploadProgress} onClick={() => inputRef.current?.click()}>
              <RefreshCw className="h-4 w-4" /> Replace image
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setCourseLandingFormData((prev) => ({ ...prev, image: "" }))}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={mediaUploadProgress}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            uploadImage(event.dataTransfer.files?.[0]);
          }}
          className={`flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white transition ${
            dragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/60 hover:bg-slate-50"
          }`}
        >
          {mediaUploadProgress ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Uploading… {mediaUploadProgressPercentage}%</span>
              <div className="h-2 w-56 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${mediaUploadProgressPercentage}%` }} />
              </div>
            </>
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ImagePlus className="h-7 w-7 text-primary" />
              </span>
              <span className="text-sm font-semibold text-slate-700">Drag &amp; drop an image, or click to upload</span>
              <span className="text-xs text-muted-foreground">PNG or JPG</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default CourseSettings;
