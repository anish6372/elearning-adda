import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { courseCategories, courseLevelOptions, languageOptions } from "@/config";
import { InstructorContext } from "@/context/instructor-context";
import { useContext } from "react";

function Field({ label, htmlFor, hint, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="font-semibold text-slate-700">
          {label}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function OptionSelect({ id, value, onChange, options, placeholder }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CourseLanding() {
  const { courseLandingFormData: data, setCourseLandingFormData } = useContext(InstructorContext);

  const set = (field) => (value) => setCourseLandingFormData((prev) => ({ ...prev, [field]: value }));
  const onText = (field) => (event) => set(field)(event.target.value);
  const count = (field, max) => `${(data[field] || "").length}/${max}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Course details</h2>
        <p className="text-sm text-muted-foreground">This is what students see on the course page and in search.</p>
      </div>

      <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Basics</h3>
        <Field label="Course title" htmlFor="title" hint={count("title", 80)}>
          <Input id="title" maxLength={80} placeholder="e.g. Node.js from Zero to Production" value={data.title} onChange={onText("title")} />
        </Field>
        <Field label="Subtitle" htmlFor="subtitle" hint={count("subtitle", 120)}>
          <Input
            id="subtitle"
            maxLength={120}
            placeholder="One line on what students will be able to do"
            value={data.subtitle}
            onChange={onText("subtitle")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category">
            <OptionSelect id="category" value={data.category} onChange={set("category")} options={courseCategories} placeholder="Select a category" />
          </Field>
          <Field label="Level" htmlFor="level">
            <OptionSelect id="level" value={data.level} onChange={set("level")} options={courseLevelOptions} placeholder="Select a level" />
          </Field>
          <Field label="Primary language" htmlFor="primaryLanguage">
            <OptionSelect
              id="primaryLanguage"
              value={data.primaryLanguage}
              onChange={set("primaryLanguage")}
              options={languageOptions}
              placeholder="Select a language"
            />
          </Field>
          <Field label="Price (USD)" htmlFor="pricing" hint="0 = free">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="pricing"
                type="number"
                min="0"
                step="0.01"
                placeholder="49.99"
                className="pl-7"
                value={data.pricing}
                onChange={onText("pricing")}
              />
            </div>
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">About the course</h3>
        <Field label="Description" htmlFor="description" hint={count("description", 2000)}>
          <Textarea
            id="description"
            maxLength={2000}
            rows={5}
            placeholder="What is this course about, and who is it for?"
            value={data.description}
            onChange={onText("description")}
          />
        </Field>
        <Field label="Learning objectives" htmlFor="objectives" hint="One per line or comma separated">
          <Textarea
            id="objectives"
            rows={4}
            placeholder={"Build REST APIs with Express\nModel data with MongoDB"}
            value={data.objectives}
            onChange={onText("objectives")}
          />
        </Field>
        <Field label="Welcome message" htmlFor="welcomeMessage" hint="Shown after a student enrolls">
          <Textarea
            id="welcomeMessage"
            rows={3}
            placeholder="Welcome aboard! Here is how to get the most out of this course..."
            value={data.welcomeMessage}
            onChange={onText("welcomeMessage")}
          />
        </Field>
      </section>
    </div>
  );
}

export default CourseLanding;
