// Shared required-field validation for every form in the app.
//
// Each form describes its mandatory fields with a zod schema built from the
// helpers below, then calls `validateForm(schema, data)` in its submit
// handler. When something is missing, the user gets a toast naming each
// missing field ("Company name is required") and the form gets a
// { fieldName: message } map it can show under the matching inputs.
import { z } from "zod";
import { toast } from "react-toastify";

const isEmpty = (v) =>
  v === undefined ||
  v === null ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "number" && Number.isNaN(v));

const requiredMessage = (label) => `${label} is required`;

// Text, select, or date field that must not be blank (whitespace counts as blank).
export const requiredString = (label) =>
  z.any().refine((v) => !isEmpty(v), { message: requiredMessage(label) });

// Any value that must be present: a number, an id, a file, a non-empty list...
export const requiredValue = requiredString;

// Number field that must be filled in (0 is allowed unless `min` says otherwise).
export const requiredNumber = (label, { min } = {}) =>
  z.any().superRefine((v, ctx) => {
    if (isEmpty(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredMessage(label) });
      return;
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number` });
    } else if (min !== undefined && n < min) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be at least ${min}` });
    }
  });

// Email field that must be filled in and look like an email address.
export const requiredEmail = (label = "Email") =>
  z.any().superRefine((v, ctx) => {
    if (isEmpty(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredMessage(label) });
    } else if (!z.string().email().safeParse(String(v).trim()).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Enter a valid ${label.toLowerCase()}` });
    }
  });

// Builds an object schema that only checks the listed fields and lets every
// other key through untouched.
export const requiredFields = (shape) => z.object(shape).passthrough();

/**
 * Runs `schema` against `data`.
 * Returns { success, errors } where errors is { fieldName: message } (nested
 * paths are joined with "."). On failure it also shows one toast listing every
 * missing field, unless `{ toast: false }` is passed.
 */
export function validateForm(schema, data, { toast: showToast = true } = {}) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return { success: true, errors: {} };

  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }

  if (showToast) showValidationToast(errors);
  return { success: false, errors };
}

export function showValidationToast(errors) {
  const messages = [...new Set(Object.values(errors))];
  if (!messages.length) return;
  toast.error(
    messages.length === 1 ? (
      messages[0]
    ) : (
      <div>
        {messages.map((m) => (
          <div key={m}>{m}</div>
        ))}
      </div>
    ),
    { toastId: "form-validation" }
  );
}

// Red message shown under an input. Accepts a message string; renders nothing
// for empty values or plain `true` flags.
export function FieldError({ error, className = "" }) {
  if (!error || typeof error !== "string") return null;
  return <p className={`text-red-500 text-xs mt-1 ${className}`}>{error}</p>;
}
