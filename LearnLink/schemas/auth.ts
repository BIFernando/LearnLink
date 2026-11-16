import { z } from "zod";

const studentAcademicEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .refine(
    (email) => {
      const domain = email.split("@").pop() ?? "";
      return domain === "ac.lk" || domain.endsWith(".ac.lk");
    },
    "Use an academic email address ending in .ac.lk.",
  );

export const studentRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Enter your full name.")
      .max(100, "Full name must be 100 characters or fewer."),
    email: studentAcademicEmailSchema,
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine(
    ({ password, confirmPassword }) =>
      confirmPassword.length === 0 || password === confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    },
  );

export const studentLoginSchema = z.object({
  email: studentAcademicEmailSchema,
  password: z.string().min(1, "Enter your password."),
});

export type StudentRegistrationValues = z.infer<
  typeof studentRegistrationSchema
>;

export type StudentLoginValues = z.infer<typeof studentLoginSchema>;
