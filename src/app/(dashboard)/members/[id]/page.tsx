import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MemberDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "members:view")) redirect("/dashboard");
  const { id } = await params;
  const member = await db.member.findFirst({ where: { id, organizationId: user.organizationId }, include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, startDate: true, endDate: true, amount: true, status: true, plan: { select: { name: true } } } } } });
  if (!member) notFound();
  const currentMembership = member.subscriptions.find((subscription) => subscription.status === "ACTIVE");
  return <div className="space-y-6"><div><p className="text-sm text-muted-foreground">Member profile</p><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1><Badge variant={member.status === "ACTIVE" ? "success" : "secondary"}>{member.status}</Badge></div></div><Card><CardHeader><CardTitle>Contact and profile</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Phone</p><p>{member.phone}</p></div><div><p className="text-xs text-muted-foreground">Email</p><p>{member.email ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Date of birth</p><p>{member.dateOfBirth?.toLocaleDateString() ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Gender</p><p>{member.gender ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Address</p><p>{member.address ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Emergency contact</p><p>{member.emergencyContact ?? "-"}</p></div><div><p className="text-xs text-muted-foreground">Join date</p><p>{member.joiningDate.toLocaleDateString()}</p></div></CardContent></Card><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Membership</CardTitle></CardHeader><CardContent>{currentMembership ? <div className="space-y-1 text-sm"><p className="font-medium">{currentMembership.plan.name}</p><p>₹{currentMembership.amount.toString()}</p><p className="text-muted-foreground">{currentMembership.startDate.toLocaleDateString()} to {currentMembership.endDate.toLocaleDateString()}</p><Badge variant="success">{currentMembership.status}</Badge></div> : <p className="text-sm text-muted-foreground">No active membership yet.</p>}</CardContent></Card>{[["Payments", "Payment history will appear here."], ["Attendance", "Attendance history will appear here."]].map(([title, text]) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{text}</CardContent></Card>)}</div></div>;
}