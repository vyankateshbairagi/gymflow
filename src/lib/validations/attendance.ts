import { z } from "zod";

export const checkInSchema = z.object({ memberId: z.string().trim().min(1, "Member is required") });
export const checkOutSchema = z.object({ attendanceId: z.string().trim().min(1, "Attendance record is required") });
export type CheckInValues = z.infer<typeof checkInSchema>;