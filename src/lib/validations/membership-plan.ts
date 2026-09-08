import { z } from "zod";

const moneyPattern = /^\d{1,8}(?:\.\d{1,2})?$/;

export const membershipPlanFormSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.string().trim().regex(moneyPattern, "Enter a valid price with up to 2 decimal places"),
  durationInDays: z.coerce.number().int("Duration must be a whole number").positive("Duration must be greater than 0").max(3650),
  isActive: z.boolean(),
});

export const membershipPlanUpdateSchema = membershipPlanFormSchema.extend({
  id: z.string().min(1),
});

export type MembershipPlanFormValues = z.infer<typeof membershipPlanFormSchema>;