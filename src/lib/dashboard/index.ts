import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  expiringSoon: number;
  pendingFees: string;
  revenueTrend: { month: string; amount: string }[];
  currentMonthRevenue: string;
  expiringMemberships: { member: string; plan: string; expiresIn: string }[];
  todaysAttendance: { member: string; time: string }[];
  recentPayments: { member: string; plan: string; amount: string; method: string; date: string }[];
};

function dayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function sum(values: Prisma.Decimal[]) {
  return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));
}

/**
 * Returns the dashboard's four headline metrics using organization-scoped
 * database queries. Financial calculations intentionally follow the same
 * append-only payment/refund rules used by the Payments and Reports modules.
 */
export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const now = new Date();
  const today = dayStart(now);
  const expiringEnd = addDays(today, 8);

  const chartStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

  const [totalMembers, activeMembers, expiringSoon, subscriptions, revenuePayments, refundPayments, expiringSubscriptions, attendanceRecords, recentPaymentRecords] = await Promise.all([
    db.member.count({ where: { organizationId } }),
    db.member.count({
      where: {
        organizationId,
        subscriptions: {
          some: {
            status: "ACTIVE",
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
    }),
    db.member.count({
      where: {
        organizationId,
        subscriptions: {
          some: {
            status: "ACTIVE",
            endDate: { gte: today, lt: expiringEnd },
          },
        },
      },
    }),
    db.subscription.findMany({
      where: { organizationId },
      select: {
        amount: true,
        payments: {
          select: {
            amount: true,
            status: true,
            originalPaymentId: true,
          },
        },
      },
    }),
    db.payment.findMany({
      where: {
        organizationId,
        paymentDate: { gte: chartStart },
        originalPaymentId: null,
        status: { notIn: ["FAILED", "VOIDED"] },
      },
      select: { amount: true, paymentDate: true },
    }),
    db.payment.findMany({
      where: {
        organizationId,
        paymentDate: { gte: chartStart },
        originalPaymentId: { not: null },
        status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
      },
      select: { amount: true, paymentDate: true },
    }),
    db.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        endDate: { gte: today, lt: expiringEnd },
      },
      orderBy: { endDate: "asc" },
      take: 10,
      select: {
        endDate: true,
        member: { select: { name: true } },
        plan: { select: { name: true } },
      },
    }),
    db.attendance.findMany({
      where: {
        organizationId,
        date: { gte: today, lt: addDays(today, 1) },
        checkInTime: { not: null },
      },
      orderBy: { checkInTime: "desc" },
      take: 10,
      select: {
        checkInTime: true,
        member: { select: { name: true } },
      },
    }),
    db.payment.findMany({
      where: {
        organizationId,
        originalPaymentId: null,
        status: { notIn: ["FAILED", "VOIDED"] },
      },
      orderBy: { paymentDate: "desc" },
      take: 5,
      select: {
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        member: { select: { name: true } },
        subscription: {
          select: {
            plan: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const pendingFees = subscriptions.reduce((total, subscription) => {
    const paid = sum(
      subscription.payments
        .filter(
          (payment) =>
            payment.originalPaymentId === null &&
            !["FAILED", "VOIDED"].includes(payment.status)
        )
        .map((payment) => payment.amount)
    );

    const refunded = sum(
      subscription.payments
        .filter(
          (payment) =>
            payment.originalPaymentId !== null &&
            ["REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)
        )
        .map((payment) => payment.amount)
    );

    return total.plus(subscription.amount).minus(paid).plus(refunded);
  }, new Prisma.Decimal(0));

  const revenueTrend = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + index, 1));
    const nextMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));
    const collected = revenuePayments
      .filter((payment) => payment.paymentDate >= monthDate && payment.paymentDate < nextMonth)
      .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
    const refunds = refundPayments
      .filter((payment) => payment.paymentDate >= monthDate && payment.paymentDate < nextMonth)
      .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));

    return {
      month: monthDate.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
      amount: collected.minus(refunds).greaterThan(0) ? collected.minus(refunds).toFixed(2) : "0.00",
    };
  });

  const currentMonthRevenue = revenueTrend[5]?.amount ?? "0.00";

  const expiringMemberships = expiringSubscriptions.map((subscription) => {
    const endDay = dayStart(subscription.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDay.getTime() - today.getTime()) / 86_400_000));
    return {
      member: subscription.member.name,
      plan: subscription.plan.name,
      expiresIn: `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`,
    };
  });

  const todaysAttendance = attendanceRecords.map((attendance) => ({
    member: attendance.member.name,
    time: attendance.checkInTime
      ? attendance.checkInTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
      : "—",
  }));

  const recentPayments = recentPaymentRecords.map((payment) => ({
    member: payment.member.name,
    plan: payment.subscription?.plan.name ?? "—",
    amount: payment.amount.toFixed(2),
    method: payment.paymentMethod.replaceAll("_", " "),
    date: payment.paymentDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  return {
    totalMembers,
    activeMembers,
    expiringSoon,
    pendingFees: pendingFees.greaterThan(0) ? pendingFees.toFixed(2) : "0.00",
    revenueTrend,
    currentMonthRevenue,
    expiringMemberships,
    todaysAttendance,
    recentPayments,
  };
}
