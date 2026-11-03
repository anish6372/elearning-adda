import { courseCategories, courseLevelOptions } from "@/config";
import { CheckCircle2, Circle, ImageIcon, PlayCircle } from "lucide-react";

const labelFor = (options, id) => options.find((o) => o.id === id)?.label;

// Live card preview: roughly what students will see in the catalog
export function CoursePreviewCard({ landing, curriculum, instructorName }) {
  const price = landing.pricing === "" || landing.pricing == null ? null : Number(landing.pricing);
  const lectureCount = curriculum.filter((l) => l.videoUrl).length;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {landing.image ? (
        <img src={landing.image} alt="" className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
          <ImageIcon className="h-8 w-8 text-indigo-300" />
        </div>
      )}
      <div className="space-y-2 p-4">
        <p className="line-clamp-2 font-bold text-slate-900">{landing.title || "Your course title"}</p>
        <p className="text-xs text-muted-foreground">{instructorName || "Instructor"}</p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {labelFor(courseCategories, landing.category) && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
              {labelFor(courseCategories, landing.category)}
            </span>
          )}
          {labelFor(courseLevelOptions, landing.level) && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {labelFor(courseLevelOptions, landing.level)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <PlayCircle className="h-3.5 w-3.5" /> {lectureCount} lecture{lectureCount === 1 ? "" : "s"}
          </span>
          <span className="text-lg font-extrabold text-slate-900">
            {price === null || Number.isNaN(price) ? "—" : price === 0 ? "Free" : `$${price.toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PublishChecklist({ checklist, onGoToStep }) {
  const percent = Math.round((checklist.completed / checklist.total) * 100);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold text-slate-900">Ready to publish?</p>
        <span className="text-xs font-semibold text-muted-foreground">
          {checklist.completed}/{checklist.total}
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${checklist.ready ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="space-y-1">
        {checklist.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onGoToStep(item.step)}
              className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-slate-50"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
              )}
              <span className={item.done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-700"}>
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
