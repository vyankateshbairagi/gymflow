"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, MoreHorizontal, Pencil, Search, UserPlus, UserX } from "lucide-react";

import { createMember, deactivateMember, updateMember } from "@/actions/members";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";

type Member = { id: string; name: string; phone: string; email: string | null; status: "ACTIVE" | "INACTIVE" | "EXPIRED"; joiningDate: string; gender: string | null; dateOfBirth: string | null; address: string | null; emergencyContact: string | null };

const emptyValues: MemberFormValues = { firstName: "", lastName: "", phone: "", email: "", dateOfBirth: "", gender: "", address: "", emergencyContactName: "", emergencyContactPhone: "", joiningDate: new Date().toISOString().slice(0, 10), status: "ACTIVE" };
const memberStatuses = ["ACTIVE", "INACTIVE", "EXPIRED"] as const;

function statusLabel(status: Member["status"]) { return status.charAt(0) + status.slice(1).toLowerCase(); }
function statusVariant(status: Member["status"]) { return status === "ACTIVE" ? "success" : status === "INACTIVE" ? "secondary" : "warning"; }
function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${month}/${day}/${year}`;
}
function formValues(member?: Member): MemberFormValues {
  if (!member) return emptyValues;
  const [firstName, ...lastParts] = member.name.split(" ");
  const [emergencyContactName = "", emergencyContactPhone = ""] = (member.emergencyContact ?? "").split(" · ");
  return { ...emptyValues, firstName, lastName: lastParts.join(" "), phone: member.phone, email: member.email ?? "", gender: member.gender ?? "", address: member.address ?? "", emergencyContactName, emergencyContactPhone, dateOfBirth: member.dateOfBirth?.slice(0, 10) ?? "", joiningDate: member.joiningDate.slice(0, 10), status: member.status };
}

function MemberForm({ member, onDone }: { member?: Member; onDone: (message: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<MemberFormValues>({ resolver: zodResolver(memberFormSchema), defaultValues: formValues(member) });
  const onSubmit = (values: MemberFormValues) => startTransition(async () => {
    setError("");
    const result = member ? await updateMember({ ...values, id: member.id }) : await createMember(values);
    if (!result.success) { setError(result.message); Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => setFieldError(field as keyof MemberFormValues, { message })); return; }
    onDone(result.message);
  });
  const field = (name: keyof MemberFormValues, label: string, type = "text", required = false) => <label className="space-y-1 text-sm"><span>{label}{required && " *"}</span><Input type={type} {...register(name)} aria-invalid={Boolean(errors[name])} />{errors[name] && <span className="text-xs text-destructive">{errors[name]?.message}</span>}</label>;
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{field("firstName", "First name", "text", true)}{field("lastName", "Last name", "text", true)}{field("phone", "Phone", "tel", true)}{field("email", "Email", "email")}{field("dateOfBirth", "Date of birth", "date")}<fieldset className="space-y-2 text-sm"><legend>Gender</legend><div className="flex flex-wrap gap-4">{["Male", "Female", "Other"].map((option) => <label key={option} className="flex items-center gap-2"><input type="radio" value={option} {...register("gender")} />{option}</label>)}</div>{errors.gender && <span className="text-xs text-destructive">{errors.gender.message}</span>}</fieldset>{field("joiningDate", "Join date", "date", true)}<label className="space-y-1 text-sm"><span>Status</span><select {...register("status")} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">{memberStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-2">{field("emergencyContactName", "Emergency contact name")}{field("emergencyContactPhone", "Emergency contact phone")}</div>{field("address", "Address")} {error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : member ? "Save changes" : "Add member"}</Button></div></form>;
}

export function MemberWorkspace({ members, canEdit, canDeactivate, canCreate }: { members: Member[]; canEdit: boolean; canDeactivate: boolean; canCreate: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dialog, setDialog] = useState<"add" | Member | null>(null);
  const [memberToDeactivate, setMemberToDeactivate] = useState<Member | null>(null);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const filtered = members.filter((member) => { const haystack = `${member.name} ${member.phone} ${member.email ?? ""}`.toLowerCase(); return haystack.includes(query.toLowerCase()) && (status === "ALL" || member.status === status); });
  const done = (message: string) => { setDialog(null); setNotice(message); router.refresh(); };
  const deactivate = () => {
    if (!memberToDeactivate) return;
    startTransition(async () => {
      const result = await deactivateMember(memberToDeactivate.id);
      setNotice(result.message);
      if (result.success) {
        setMemberToDeactivate(null);
        router.refresh();
      }
    });
  };
  return <>
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, or email" className="pl-9" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="border-input bg-background h-9 rounded-md border px-3 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="EXPIRED">Expired</option></select>{canCreate && <Button onClick={() => setDialog("add")}><UserPlus className="size-4" />Add member</Button>}</div>
    {notice && <p className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {filtered.length === 0 ? <div className="flex flex-col items-center gap-2 px-6 py-16 text-center"><UserPlus className="text-muted-foreground size-8" /><p className="font-medium">{members.length ? "No members match your search" : "No members yet"}</p><p className="text-sm text-muted-foreground">{members.length ? "Try a different search or status filter." : "Add your first member to start managing your gym."}</p>{canCreate && !members.length && <Button onClick={() => setDialog("add")}><UserPlus className="size-4" />Add member</Button>}</div> : <Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Join date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((member) => <TableRow key={member.id}><TableCell><Link href={`/members/${member.id}`} className="font-medium hover:underline">{member.name}</Link></TableCell><TableCell>{member.phone}</TableCell><TableCell>{member.email ?? "-"}</TableCell><TableCell><Badge variant={statusVariant(member.status)}>{statusLabel(member.status)}</Badge></TableCell><TableCell>{formatDate(member.joiningDate)}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/members/${member.id}`}><Eye className="size-4" />View</Link></DropdownMenuItem>{canEdit && <DropdownMenuItem onClick={() => setDialog(member)}><Pencil className="size-4" />Edit</DropdownMenuItem>}{canDeactivate && member.status !== "INACTIVE" && <DropdownMenuItem variant="destructive" disabled={isPending} onClick={() => setMemberToDeactivate(member)}><UserX className="size-4" />Deactivate</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table>}
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>{dialog === "add" ? "Add member" : "Edit member"}</DialogTitle><DialogDescription>Keep member information current for your organization.</DialogDescription></DialogHeader><div className="mt-5"><MemberForm member={dialog && dialog !== "add" ? dialog : undefined} onDone={done} /></div></DialogContent></Dialog>
    <Dialog open={memberToDeactivate !== null} onOpenChange={(open) => !open && !isPending && setMemberToDeactivate(null)}><DialogContent><DialogHeader><DialogTitle>Deactivate member?</DialogTitle><DialogDescription>Are you sure you want to deactivate this member? Their historical records will be preserved.</DialogDescription></DialogHeader><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={isPending} onClick={() => setMemberToDeactivate(null)}>Cancel</Button><Button variant="destructive" disabled={isPending} onClick={deactivate}>{isPending ? "Deactivating..." : "Deactivate Member"}</Button></div></DialogContent></Dialog>
  </>;
}