import { Users, UserCheck, AlarmClock, Wallet, IndianRupee } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { MockDataBadge } from "@/components/shared/mock-data-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// All data on this page is hard-coded placeholder data for Day 1. None of it
// is read from the database yet — that's intentional (see project brief).
// ---------------------------------------------------------------------------

const stats = [
  { label: "Total Members", value: "452", icon: Users, tone: "default" as const },
  { label: "Active Members", value: "387", icon: UserCheck, tone: "positive" as const },
  { label: "Expiring Soon", value: "21", icon: AlarmClock, tone: "warning" as const },
  { label: "Pending Fees", value: "₹38,500", icon: Wallet, tone: "warning" as const },
];

const recentPayments = [
  { member: "Aarav Sharma", plan: "Quarterly", amount: "₹4,500", method: "UPI", date: "5 Sep" },
  { member: "Priya Nair", plan: "Monthly", amount: "₹1,500", method: "Cash", date: "5 Sep" },
  { member: "Rohan Mehta", plan: "Yearly", amount: "₹14,000", method: "Card", date: "4 Sep" },
  { member: "Sneha Iyer", plan: "Monthly", amount: "₹1,500", method: "UPI", date: "4 Sep" },
  { member: "Kabir Singh", plan: "Half Yearly", amount: "₹7,200", method: "Bank Transfer", date: "3 Sep" },
];

const expiringMemberships = [
  { member: "Ananya Gupta", plan: "Monthly", expiresIn: "2 days" },
  { member: "Vikram Rao", plan: "Quarterly", expiresIn: "3 days" },
  { member: "Meera Joshi", plan: "Monthly", expiresIn: "5 days" },
  { member: "Arjun Kapoor", plan: "Yearly", expiresIn: "6 days" },
];

const todaysAttendance = [
  { member: "Riya Malhotra", time: "6:12 AM" },
  { member: "Dev Patel", time: "6:45 AM" },
  { member: "Ishaan Bose", time: "7:03 AM" },
  { member: "Tara Kulkarni", time: "7:20 AM" },
  { member: "Nikhil Verma", time: "8:01 AM" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your gym&apos;s activity.
          </p>
        </div>
        <MockDataBadge />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Revenue overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="size-4" />
            Revenue Overview
          </CardTitle>
          <CardDescription>Monthly revenue trend (placeholder)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            {[
              { m: "Apr", v: 40 },
              { m: "May", v: 55 },
              { m: "Jun", v: 48 },
              { m: "Jul", v: 62 },
              { m: "Aug", v: 70 },
              { m: "Sep", v: 82 },
            ].map((bar) => (
              <div key={bar.m} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-primary/80"
                    style={{ height: `${bar.v}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{bar.m}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This month&apos;s revenue:{" "}
            <span className="font-medium text-foreground">₹2,45,000</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest transactions across all members</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((p) => (
                  <TableRow key={p.member}>
                    <TableCell className="font-medium">{p.member}</TableCell>
                    <TableCell className="text-muted-foreground">{p.plan}</TableCell>
                    <TableCell className="text-muted-foreground">{p.method}</TableCell>
                    <TableCell className="text-right">{p.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expiring memberships */}
        <Card>
          <CardHeader>
            <CardTitle>Expiring Memberships</CardTitle>
            <CardDescription>Members who need a renewal reminder</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Expires in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringMemberships.map((m) => (
                  <TableRow key={m.member}>
                    <TableCell className="font-medium">{m.member}</TableCell>
                    <TableCell className="text-muted-foreground">{m.plan}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning" className="font-normal">
                        {m.expiresIn}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Today's attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
          <CardDescription>Members checked in so far today</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Check-in time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaysAttendance.map((a) => (
                <TableRow key={a.member}>
                  <TableCell className="font-medium">{a.member}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {a.time}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
