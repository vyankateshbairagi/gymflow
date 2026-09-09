import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
function today() { const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())); }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "attendance:view")) redirect("/dashboard");
  const params = await searchParams;
  const search = first(params.search)?.trim() ?? "";
  const selectedDate = first(params.date) ?? dateKey(today());
  const status = first(params.status) ?? "ALL";
  const page = Math.max(1, Number(first(params.page) ?? "1") || 1);
  const pageSize = 20;
  const day = new Date(`${selectedDate}T00:00:00.000Z`);
  const nextDay = new Date(day); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const currentDay = today();
  const currentNextDay = new Date(currentDay); currentNextDay.setUTCDate(currentNextDay.getUTCDate() + 1);
  const where: Prisma.AttendanceWhereInput = { organizationId: user.organizationId, date: { gte: day, lt: nextDay } };
  if (search) where.member = { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }] };
  if (status === "CURRENT") where.checkOutTime = null;
  if (status === "COMPLETED") where.checkOutTime = { not: null };
  const [records, total, totalToday, currentToday, completedToday, members] = await Promise.all([
    db.attendance.findMany({ where, orderBy: { checkInTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, date: true, checkInTime: true, checkOutTime: true, member: { select: { id: true, name: true, phone: true } } } }),
    db.attendance.count({ where }),
    db.attendance.count({ where: { organizationId: user.organizationId, date: { gte: currentDay, lt: currentNextDay } } }),
    db.attendance.count({ where: { organizationId: user.organizationId, date: { gte: currentDay, lt: currentNextDay }, checkOutTime: null } }),
    db.attendance.count({ where: { organizationId: user.organizationId, date: { gte: currentDay, lt: currentNextDay }, checkOutTime: { not: null } } }),
    db.member.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
  ]);
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Attendance</h1><p className="text-sm text-muted-foreground">Track member check-ins and attendance history.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Today&apos;s check-ins</p><p className="mt-2 text-2xl font-semibold">{totalToday}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Currently in</p><p className="mt-2 text-2xl font-semibold">{currentToday}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Today&apos;s completed</p><p className="mt-2 text-2xl font-semibold">{completedToday}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total attendance</p><p className="mt-2 text-2xl font-semibold">{total}</p></CardContent></Card></div><Card><CardContent className="p-0"><AttendanceWorkspace records={records.map((record) => ({ ...record, date: record.date.toISOString(), checkInTime: record.checkInTime?.toISOString() ?? null, checkOutTime: record.checkOutTime?.toISOString() ?? null }))} members={members} canCreate={can(user.role, "attendance:create")} canUpdate={can(user.role, "attendance:update")} search={search} selectedDate={selectedDate} status={status} page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} /></CardContent></Card></div>;
}
