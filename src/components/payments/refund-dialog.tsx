"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundPayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function RefundDialog({ paymentId, amount }: { paymentId: string; amount: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(amount);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const submit = () => startTransition(async () => { const result = await refundPayment({ paymentId, amount: refundAmount, reason }); if (!result.success) { setError(result.message); return; } setOpen(false); router.refresh(); });
  return <><Button variant="destructive" onClick={() => setOpen(true)}>Refund payment</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Refund payment?</DialogTitle><DialogDescription>The original payment will remain in history and a new refund record will be created.</DialogDescription></DialogHeader><div className="mt-5 space-y-4"><label className="space-y-1 text-sm"><span>Refund amount</span><Input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></label><label className="space-y-1 text-sm"><span>Reason</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2" /></label>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" disabled={isPending} onClick={submit}>{isPending ? "Saving..." : "Confirm refund"}</Button></div></div></DialogContent></Dialog></>;
}
