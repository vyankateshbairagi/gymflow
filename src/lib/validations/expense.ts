import { z } from "zod";

export const expenseCategories = ["RENT", "ELECTRICITY", "WATER", "INTERNET", "EQUIPMENT", "EQUIPMENT_REPAIR", "MAINTENANCE", "CLEANING", "STAFF", "MARKETING", "SUPPLIES", "SOFTWARE", "INSURANCE", "TAX", "MISCELLANEOUS", "OTHER"] as const;
export const expenseStatuses = ["PAID", "PENDING", "CANCELLED"] as const;
export const expenseSchema = z.object({
  category: z.enum(expenseCategories),
  amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter a valid amount").refine((value) => value !== "0" && !/^0+\.0+$/.test(value), "Amount must be greater than zero"),
  title: z.string().trim().min(1, "Description is required").max(200),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expense date is required"),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE", "OTHER"]).optional(),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(expenseStatuses),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;
