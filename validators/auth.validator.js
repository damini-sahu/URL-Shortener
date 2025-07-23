import z from "zod"

const nameSchema = z
    .string()
    .trim()
    .min(3, { message: "Name must be atleast 3 chracters long" })
    .max(100, { message: "Name must be no more than 100 chracters" })

const emailSchema = z
    .string()
    .email({ message: " Please enter a valid email address" })
    .max(100, { message: " Email must be no more than 100 characters" })


export const loginUserSchema = z.object({
    email: emailSchema,

    password: z
        .string()
        .min(6, { message: " Password must be at least six characters long" })
        .max(100, { message: " Password must be no more than 100 characters" })
})


export const registerUserSchema = loginUserSchema.extend({
    name: nameSchema,
})

export const verifyEmailSchema = z.object({
    token: z.string().trim().length(8),
    email: z.string().trim().email(),
})

export const verifyUserSchema = z.object({
    name: nameSchema,
})

export const verifyPasswordSchema = z.object({
    currentPassword: z
    .string()
    .min(1, {message: " Current Password is required"}),
    newPassword: z
    .string()
    .min(6, {message: " Your New Password must be at least 6 characters long."})
    .max(100, {message: " Your New Password must be no more than 100 characters."}),
    confirmPassword: z
    .string()
    .min(6, {message: " Your Confirm Password must be at least 6 characters long."})
    .max(100, {message: " Your Confirm Password must be no more than 100 characters."}),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: " Password don't match",
    path: ["confirmPassword"],     //! Error will be associated with confirmPassword field
})

export const forgotPasswordSchema = z.object({
    email: emailSchema,
})

const passwordSchema = z.object({
 newPassword: z
    .string()
    .min(6, {message: " Your New Password must be at least 6 characters long."})
    .max(100, {message: " Your New Password must be no more than 100 characters."}),
    confirmPassword: z
    .string()
    .min(6, {message: " Your Confirm Password must be at least 6 characters long."})
    .max(100, {message: " Your Confirm Password must be no more than 100 characters."}),
})
.refine((data) => data.newPassword === data.confirmPassword, {
    message: " Password don't match",
    path: ["confirmPassword"],     //! Error will be associated with confirmPassword field
})

export const verifyResetPasswordSchema = passwordSchema;
export const setPasswordSchema = passwordSchema;