import { z } from "zod";

export const studentProfileUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Enter your display name.")
      .max(100, "Display name must be 100 characters or fewer."),
    bio: z
      .string()
      .trim()
      .max(1000, "Bio must be 1,000 characters or fewer."),
    university: z
      .string()
      .trim()
      .max(150, "University must be 150 characters or fewer.")
      .optional(),
    faculty: z
      .string()
      .trim()
      .max(150, "Faculty must be 150 characters or fewer.")
      .optional(),
    degree: z
      .string()
      .trim()
      .max(150, "Degree must be 150 characters or fewer.")
      .optional(),
    course: z
      .string()
      .trim()
      .max(150, "Course must be 150 characters or fewer.")
      .optional(),
    academicYear: z
      .string()
      .trim()
      .max(40, "Academic year must be 40 characters or fewer.")
      .optional(),
  })
  .strict();

export type StudentProfileUpdate = z.infer<
  typeof studentProfileUpdateSchema
>;
