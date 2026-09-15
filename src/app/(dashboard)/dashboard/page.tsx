import { Users, UserCheck, AlarmClock, Wallet, IndianRupee } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/dashboard";
import { getCurrentUser } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const statsData = await getDashboardStats(user.organizationId);
  const todaysAttendance = statsData.todaysAttendance;
  const todaysAttendanceCount = todaysAttendance.length;
  const expiringMemberships = statsData.expiringMemberships;
  const recentPayments = statsData.recentPayments;
  const stats = [
    { label: "Total Members", value: statsData.totalMembers.toLocaleString("en-IN"), icon: Users, tone: "default" as const },
    { label: "Active Members", value: statsData.activeMembers.toLocaleString("en-IN"), icon: UserCheck, tone: "positive" as const },
    { label: "Expiring Soon", value: statsData.expiringSoon.toLocaleString("en-IN"), icon: AlarmClock, tone: "warning" as const },
    { label: "Pending Fees", value: `₹${Number(statsData.pendingFees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Wallet, tone: "warning" as const },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your gym&apos;s activity.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s Attendance</p>
            <p className="mt-1 text-2xl font-semibold">{todaysAttendanceCount}</p>
          </div>
          <UserCheck className="size-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {/* Revenue overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="size-4" />
            Revenue Overview
          </CardTitle>
          <CardDescription>Revenue collected over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            {statsData.revenueTrend.map((bar, index) => {
              const maxRevenue = Math.max(...statsData.revenueTrend.map((item) => Number(item.amount)), 1);
              const height = (Number(bar.amount) / maxRevenue) * 100;
              return (
                <div key={`${bar.month}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-primary/80"
                      style={{ height: `${Math.max(height, Number(bar.amount) > 0 ? 4 : 0)}%` }}
                      title={`₹${Number(bar.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{bar.month}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This month&apos;s revenue:{" "}
            <span className="font-medium text-foreground">
              ₹{Number(statsData.currentMonthRevenue).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
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
                    <TableCell className="text-right">₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
