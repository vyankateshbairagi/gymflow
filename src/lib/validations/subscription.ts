import { z } from "zod";

export const subscriptionFormSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required"),
  planId: z.string().trim().min(1, "Membership plan is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;