// Publish rules for the course builder, kept pure so the checklist, stepper and tests share them
const filled = (value) => value !== "" && value !== null && value !== undefined;

const BASIC_FIELDS = ["title", "subtitle", "category", "level", "primaryLanguage"];
const ABOUT_FIELDS = ["description", "objectives", "welcomeMessage"];

export function isLectureReady(lecture) {
  return Boolean(lecture?.title?.trim() && lecture?.videoUrl && lecture?.public_id);
}

export function getCourseChecklist(landing = {}, curriculum = []) {
  const items = [
    { id: "basics", step: "details", label: "Title, subtitle, category, level & language", done: BASIC_FIELDS.every((f) => filled(landing[f])) },
    { id: "pricing", step: "details", label: "Price set", done: filled(landing.pricing) && Number(landing.pricing) >= 0 },
    { id: "about", step: "details", label: "Description, objectives & welcome message", done: ABOUT_FIELDS.every((f) => filled(landing[f])) },
    { id: "lectures", step: "curriculum", label: "Every lecture has a title and a video", done: curriculum.length > 0 && curriculum.every(isLectureReady) },
    { id: "preview", step: "curriculum", label: "At least one free preview lecture", done: curriculum.some((l) => l.freePreview) },
    { id: "thumbnail", step: "media", label: "Course thumbnail uploaded", done: filled(landing.image) },
  ];
  const completed = items.filter((i) => i.done).length;
  return { items, completed, total: items.length, ready: completed === items.length };
}

// A step is complete when every checklist item that belongs to it is done
export function isStepComplete(checklist, stepId) {
  const forStep = checklist.items.filter((i) => i.step === stepId);
  return forStep.length > 0 && forStep.every((i) => i.done);
}

export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
