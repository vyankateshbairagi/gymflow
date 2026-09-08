import { z } from "zod";

export const paymentMethodSchema = z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE", "OTHER"]);
export const paymentSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required"),
  subscriptionId: z.string().trim().min(1, "Subscription is required"),
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter a valid amount").refine((value) => Number(value) > 0, "Amount must be greater than zero"),
  paymentMethod: paymentMethodSchema,
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date is required"),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/).refine((value) => Number(value) > 0, "Refund amount must be greater than zero"),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;