import Link from "next/link";
import { Prisma, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

function price(value: string) { const [whole, decimals] = value.split("."); return `₹${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${decimals ? `.${decimals}` : ".00"}`; }
function date(value: Date) { const [year, month, day] = value.toISOString().slice(0, 10).split("-"); return `${month}/${day}/${year}`; }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "payments:view")) redirect("/dashboard");
  const params = await searchParams;
  const search = first(params.search)?.trim() ?? "";
  const method = first(params.method);
  const status = first(params.status);
  const page = Math.max(1, Number(first(params.page) ?? "1") || 1);
  const pageSize = 20;
  const where: Prisma.PaymentWhereInput = { organizationId: user.organizationId };
  if (method) where.paymentMethod = method as PaymentMethod;
  if (status) where.status = status as PaymentStatus;
  if (search) where.OR = [{ id: { contains: search, mode: "insensitive" } }, { receiptNumber: { contains: search, mode: "insensitive" } }, { member: { name: { contains: search, mode: "insensitive" } } }, { member: { phone: { contains: search, mode: "insensitive" } } }];
  const [payments, total, completed, refunded, subscriptions] = await Promise.all([
    db.payment.findMany({ where, orderBy: { paymentDate: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, amount: true, paymentMethod: true, paymentDate: true, receiptNumber: true, status: true, member: { select: { name: true } }, subscription: { select: { plan: { select: { name: true } } } } } }),
    db.payment.count({ where }),
    db.payment.aggregate({ where: { organizationId: user.organizationId, status: "COMPLETED" }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { organizationId: user.organizationId, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } }, _sum: { amount: true } }),
    db.subscription.findMany({ where: { organizationId: user.organizationId }, select: { amount: true, payments: { where: { status: "COMPLETED" }, select: { amount: true } } } }),
  ]);
  const outstanding = subscriptions.reduce((sum, subscription) => sum + Number(subscription.amount) - subscription.payments.reduce((paid, payment) => paid + Number(payment.amount), 0), 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="space-y-6"><div className="flex items-start justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">Payments</h1><p className="text-sm text-muted-foreground">Record and review payment history.</p></div>{can(user.role, "payments:create") && <Button asChild><Link href="/payments/new">Record payment</Link></Button>}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardHeader><CardTitle className="text-sm">Total collected</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{price(completed._sum.amount?.toString() ?? "0")}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Refunded</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{price(refunded._sum.amount?.toString() ?? "0")}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{price(Math.max(0, outstanding).toFixed(2))}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{total}</CardContent></Card></div><Card><CardContent className="p-0"><form className="flex flex-col gap-3 border-b p-4 sm:flex-row"><Input name="search" defaultValue={search} placeholder="Search member, phone, payment ID, or reference" /><select name="method" defaultValue={method ?? ""} className="border-input bg-background h-9 rounded-md border px-3 text-sm"><option value="">All methods</option>{["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE", "OTHER"].map((value) => <option key={value}>{value}</option>)}</select><select name="status" defaultValue={status ?? ""} className="border-input bg-background h-9 rounded-md border px-3 text-sm"><option value="">All statuses</option>{["PENDING", "FAILED", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED", "VOIDED"].map((value) => <option key={value}>{value}</option>)}</select><Button type="submit" variant="outline">Filter</Button></form>{payments.length === 0 ? <div className="px-6 py-16 text-center"><p className="font-medium">No payments found</p><p className="text-sm text-muted-foreground">Record a payment to begin building financial history.</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="h-10 px-4">Payment</th><th className="h-10 px-4">Member</th><th className="h-10 px-4">Subscription</th><th className="h-10 px-4">Amount</th><th className="h-10 px-4">Method</th><th className="h-10 px-4">Date</th><th className="h-10 px-4">Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b hover:bg-muted/50"><td className="p-4"><Link href={`/payments/${payment.id}`} className="font-medium hover:underline">{payment.receiptNumber}</Link></td><td className="p-4">{payment.member.name}</td><td className="p-4">{payment.subscription?.plan.name ?? "-"}</td><td className="p-4 font-medium">{price(payment.amount.toString())}</td><td className="p-4">{payment.paymentMethod}</td><td className="p-4">{date(payment.paymentDate)}</td><td className="p-4"><Badge variant={payment.status === "COMPLETED" ? "success" : payment.status === "REFUNDED" ? "destructive" : "secondary"}>{payment.status}</Badge></td></tr>)}</tbody></table></div>}<div className="flex items-center justify-between border-t p-4 text-sm"><span>Page {page} of {totalPages}</span><div className="flex gap-2">{page > 1 && <Button variant="outline" size="sm" asChild><Link href={`/payments?page=${page - 1}`}>Previous</Link></Button>}{page < totalPages && <Button variant="outline" size="sm" asChild><Link href={`/payments?page=${page + 1}`}>Next</Link></Button>}</div></div></CardContent></Card></div>;
}
