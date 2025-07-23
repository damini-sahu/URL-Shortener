import z from "zod"

export const shortnerSchema = z.object({
    url: z.string({ required_error: "URL is required" })
        .trim()
        .url({ message: " Please enter a valid URL" })
        .max(1024, { message: " URL can not be longer than 1024 characters" }),

        shortcode: z
        .string({required_error: " Short code is required"})
        .trim()
        .min(3, {message: " Shortcode must be at least 3 characters long"})
        .max(50, {message: " Shortcode cannot be longer than 50 characters"})
})

export const shortnerSearchParamsSchema = z.object({
    page: z.coerce
    .number()
    .int()
    .positive()
    .min(1)
    .optional()        //! Optional must come before default, otherwise default value won't be set.
    .default(1)
    .catch(1)   
})