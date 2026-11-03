import { getCourseChecklist, isStepComplete, moveItem } from "./course-builder";

const landing = {
  title: "Node.js",
  subtitle: "Deep dive",
  category: "web-development",
  level: "beginner",
  primaryLanguage: "english",
  pricing: "0",
  description: "d",
  objectives: "o",
  welcomeMessage: "w",
  image: "https://img",
};
const lecture = (overrides = {}) => ({ title: "Intro", videoUrl: "https://v", public_id: "p", freePreview: false, ...overrides });

describe("getCourseChecklist", () => {
  it("is ready only when every rule passes", () => {
    const result = getCourseChecklist(landing, [lecture({ freePreview: true })]);
    expect(result.ready).toBe(true);
    expect(result.completed).toBe(result.total);
  });

  it("accepts a free course (price 0)", () => {
    const { items } = getCourseChecklist(landing, []);
    expect(items.find((i) => i.id === "pricing").done).toBe(true);
  });

  it("flags lectures without a video and a missing free preview", () => {
    const { items, ready } = getCourseChecklist(landing, [lecture(), lecture({ videoUrl: "", public_id: "" })]);
    expect(items.find((i) => i.id === "lectures").done).toBe(false);
    expect(items.find((i) => i.id === "preview").done).toBe(false);
    expect(ready).toBe(false);
  });

  it("maps items to builder steps", () => {
    const checklist = getCourseChecklist({ ...landing, image: "" }, [lecture({ freePreview: true })]);
    expect(isStepComplete(checklist, "details")).toBe(true);
    expect(isStepComplete(checklist, "curriculum")).toBe(true);
    expect(isStepComplete(checklist, "media")).toBe(false);
  });
});

describe("moveItem", () => {
  it("reorders without mutating and ignores out-of-range moves", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(list).toEqual(["a", "b", "c"]);
  });
});
