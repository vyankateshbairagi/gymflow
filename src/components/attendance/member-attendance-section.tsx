"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkOutMember } from "@/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceRecord = { id: string; date: string; checkInTime: string | null; checkOutTime: string | null };

function date(value: string) { return value.slice(0, 10); }
function time(value: string | null) { return value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"; }
function duration(record: AttendanceRecord) { if (!record.checkInTime || !record.checkOutTime) return "-"; const minutes = Math.max(0, Math.round((new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 60000)); return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }

export function MemberAttendanceSection({ records, totalVisits, thisMonthVisits, canUpdate }: { records: AttendanceRecord[]; totalVisits: number; thisMonthVisits: number; canUpdate: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const open = records.find((record) => !record.checkOutTime);
  const lastVisit = records[0];
  const checkOut = () => { if (!open) return; startTransition(async () => { const result = await checkOutMember({ attendanceId: open.id }); if (!result.success) { setError(result.message); return; } router.refresh(); }); };
  return <Card><CardHeader><CardTitle>Attendance</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Total visits</p><p className="font-semibold">{totalVisits}</p></div><div><p className="text-xs text-muted-foreground">This month</p><p className="font-semibold">{thisMonthVisits}</p></div><div><p className="text-xs text-muted-foreground">Last visit</p><p className="font-semibold">{lastVisit ? date(lastVisit.date) : "-"}</p></div><div><p className="text-xs text-muted-foreground">Current status</p><Badge variant={open ? "success" : "secondary"}>{open ? "Currently In" : "Not Currently In"}</Badge></div></div>{open && <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3 text-sm"><span>Checked in at {time(open.checkInTime)}</span>{canUpdate && <Button size="sm" disabled={isPending} onClick={checkOut}>{isPending ? "Checking out..." : "Check out"}</Button>}</div>}{error && <p className="text-sm text-destructive">{error}</p>}<div className="space-y-2">{records.length === 0 ? <p className="text-sm text-muted-foreground">No attendance records yet.</p> : records.map((record) => <div key={record.id} className="flex items-center justify-between border-b pb-2 text-sm"><span>{date(record.date)}</span><span>{time(record.checkInTime)} to {time(record.checkOutTime)}</span><span>{duration(record)}</span><Badge variant={record.checkOutTime ? "secondary" : "success"}>{record.checkOutTime ? "Completed" : "Currently In"}</Badge></div>)}</div></CardContent></Card>;
}
