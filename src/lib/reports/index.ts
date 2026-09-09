import { Prisma, type PaymentStatus } from "@prisma/client";

import { db } from "@/lib/db";

export type ReportRange = { key: string; start: Date; end: Date; label: string };
export type ReportsData = {
  range: ReportRange;
  financial: { collected: string; refunds: string; revenue: string; outstanding: string };
  members: { total: number; active: number; newMembers: number; expiring: number };
  attendance: { today: number; trend: { date: string; count: number }[] };
  revenueTrend: { month: string; amount: string }[];
  expiringMemberships: { member: string; plan: string; endDate: string; daysRemaining: number }[];
  payments: { id: string; date: string; member: string; amount: string; method: string; status: string; reference: string }[];
};

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
function dayStart(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())); }
function addDays(value: Date, days: number) { const result = new Date(value); result.setUTCDate(result.getUTCDate() + days); return result; }
function monthStart(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)); }
function rangeFromKey(key: string | undefined): ReportRange {
  const now = new Date();
  const today = dayStart(now);
  if (key === "today") return { key, start: today, end: addDays(today, 1), label: "Today" };
  if (key === "this-week") { const start = addDays(today, -((today.getUTCDay() + 6) % 7)); return { key, start, end: addDays(start, 7), label: "This week" }; }
  if (key === "last-month") { const end = monthStart(today); return { key, start: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1)), end, label: "Last month" }; }
  if (key === "this-year") return { key, start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)), label: "This year" };
  const start = monthStart(today);
  return { key: "this-month", start, end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)), label: "This month" };
}
function money(value: Prisma.Decimal) { return value.toFixed(2); }
function monthLabel(value: Date) { return value.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }); }
function sum(values: Prisma.Decimal[]) { return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0)); }

export async function getReportsData(organizationId: string, requestedRange?: string): Promise<ReportsData> {
  const range = rangeFromKey(requestedRange);
  const today = dayStart(new Date());
  const tomorrow = addDays(today, 1);
  const [payments, collectedAggregate, refundAggregate, subscriptions, totalMembers, activeMembers, newMembers, todayAttendance, attendanceRows, expiring] = await Promise.all([
    db.payment.findMany({ where: { organizationId, paymentDate: { gte: range.start, lt: range.end } }, orderBy: { paymentDate: "desc" }, take: 100, select: { id: true, amount: true, paymentMethod: true, paymentDate: true, receiptNumber: true, status: true, originalPaymentId: true, member: { select: { name: true } } } }),
    db.payment.aggregate({ where: { organizationId, paymentDate: { gte: range.start, lt: range.end }, originalPaymentId: null, status: { notIn: ["FAILED", "VOIDED"] } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { organizationId, paymentDate: { gte: range.start, lt: range.end }, originalPaymentId: { not: null }, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } }, _sum: { amount: true } }),
    db.subscription.findMany({ where: { organizationId }, select: { amount: true, startDate: true, endDate: true, payments: { select: { amount: true, status: true, originalPaymentId: true } } } }),
    db.member.count({ where: { organizationId } }),
    db.member.count({ where: { organizationId, subscriptions: { some: { status: "ACTIVE", startDate: { lte: new Date() }, endDate: { gte: new Date() } } } } }),
    db.member.count({ where: { organizationId, createdAt: { gte: range.start, lt: range.end } } }),
    db.attendance.count({ where: { organizationId, date: { gte: today, lt: tomorrow } } }),
    db.attendance.groupBy({ by: ["date"], where: { organizationId, date: { gte: range.start, lt: range.end } }, _count: { _all: true }, orderBy: { date: "asc" } }),
    db.subscription.findMany({ where: { organizationId, status: "ACTIVE", endDate: { gte: today, lt: addDays(today, 8) } }, orderBy: { endDate: "asc" }, take: 20, select: { endDate: true, member: { select: { name: true } }, plan: { select: { name: true } } } }),
  ]);

  const collected = collectedAggregate._sum.amount ?? new Prisma.Decimal(0);
  const refunds = refundAggregate._sum.amount ?? new Prisma.Decimal(0);
  const outstanding = subscriptions.reduce((total, subscription) => total.plus(subscription.amount).minus(sum(subscription.payments.filter((payment) => !payment.originalPaymentId && !["FAILED", "VOIDED"].includes(payment.status)).map((payment) => payment.amount))).plus(sum(subscription.payments.filter((payment) => payment.originalPaymentId && ["REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)).map((payment) => payment.amount))), new Prisma.Decimal(0));
  const yearsStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const yearPayments = await db.payment.findMany({ where: { organizationId, paymentDate: { gte: yearsStart }, originalPaymentId: null, status: { notIn: ["FAILED", "VOIDED"] as PaymentStatus[] } }, select: { amount: true, paymentDate: true } });
  const revenueTrend = Array.from({ length: 12 }, (_, month) => { const values = yearPayments.filter((payment) => payment.paymentDate.getUTCMonth() === month).map((payment) => payment.amount); return { month: monthLabel(new Date(Date.UTC(new Date().getUTCFullYear(), month, 1))), amount: money(sum(values)) }; });

  return { range, financial: { collected: money(collected), refunds: money(refunds), revenue: money(collected.minus(refunds)), outstanding: money(outstanding.greaterThan(0) ? outstanding : new Prisma.Decimal(0)) }, members: { total: totalMembers, active: activeMembers, newMembers, expiring: expiring.length }, attendance: { today: todayAttendance, trend: attendanceRows.map((row) => ({ date: dateKey(row.date), count: row._count._all })) }, revenueTrend, expiringMemberships: expiring.map((item) => ({ member: item.member.name, plan: item.plan.name, endDate: dateKey(item.endDate), daysRemaining: Math.max(0, Math.ceil((item.endDate.getTime() - today.getTime()) / 86400000)) })), payments: payments.map((payment) => ({ id: payment.id, date: dateKey(payment.paymentDate), member: payment.member.name, amount: money(payment.amount), method: payment.paymentMethod, status: payment.status, reference: payment.receiptNumber })) };
}

export { rangeFromKey };
