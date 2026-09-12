"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MoreHorizontal, Pencil, Settings2, UserPlus, UserX, UserCheck } from "lucide-react";

import {
  createStaff,
  deactivateStaff,
  reactivateStaff,
  updateOrganization,
  updatePreferences,
  updateStaff,
} from "@/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  organizationUpdateSchema,
  preferencesSchema,
  staffCreateSchema,
  staffUpdateSchema,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TIMEZONES,
  type OrganizationFormValues,
  type PreferencesFormValues,
  type StaffCreateValues,
} from "@/lib/validations/settings";

type Organization = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
};

type Staff = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  isActive: boolean;
  createdAt: string;
};

const staffUpdateFormSchema = staffUpdateSchema.omit({ id: true });
type StaffUpdateFormValues = ReturnType<typeof staffUpdateFormSchema["parse"]>;

const CURRENCY_LABELS: Record<(typeof SUPPORTED_CURRENCIES)[number], string> = {
  INR: "INR — Indian Rupee (₹)",
  USD: "USD — US Dollar ($)",
  EUR: "EUR — Euro (€)",
  GBP: "GBP — British Pound (£)",
  AED: "AED — UAE Dirham (د.إ)",
};

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${month}/${day}/${year}`;
}

// ---------------------------------------------------------------------------
// Organization section
// ---------------------------------------------------------------------------

function OrganizationSection({
  organization,
  onDone,
}: {
  organization: Organization;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationUpdateSchema),
    defaultValues: {
      name: organization.name,
      email: organization.email ?? "",
      phone: organization.phone ?? "",
      address: organization.address ?? "",
    },
  });

  const onSubmit = (values: OrganizationFormValues) =>
    startTransition(async () => {
      setError("");
      const result = await updateOrganization(values);
      if (!result.success) {
        setError(result.message);
        Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) =>
          setFieldError(field as keyof OrganizationFormValues, { message })
        );
        return;
      }
      onDone(result.message);
      router.refresh();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Organization Information</h2>
        <p className="text-sm text-muted-foreground">
          This is what appears on receipts and staff logins for your gym.
        </p>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Gym name *</span>
          <Input {...register("name")} aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span>Email</span>
          <Input type="email" {...register("email")} aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span>Phone</span>
          <Input type="tel" {...register("phone")} aria-invalid={Boolean(errors.phone)} />
          {errors.phone && <span className="text-xs text-destructive">{errors.phone.message}</span>}
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Address</span>
          <Input {...register("address")} aria-invalid={Boolean(errors.address)} />
          {errors.address && <span className="text-xs text-destructive">{errors.address.message}</span>}
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preferences section
// ---------------------------------------------------------------------------

function PreferencesSection({
  organization,
  onDone,
}: {
  organization: Organization;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      currency: organization.currency as PreferencesFormValues["currency"],
      timezone: organization.timezone as PreferencesFormValues["timezone"],
    },
  });

  const onSubmit = (values: PreferencesFormValues) =>
    startTransition(async () => {
      setError("");
      const result = await updatePreferences(values);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onDone(result.message);
      router.refresh();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Used for how amounts and dates are displayed across GymFlow.
        </p>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Currency</span>
          <select
            {...register("currency")}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {CURRENCY_LABELS[code]}
              </option>
            ))}
          </select>
          {errors.currency && <span className="text-xs text-destructive">{errors.currency.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span>Timezone</span>
          <select
            {...register("timezone")}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {errors.timezone && <span className="text-xs text-destructive">{errors.timezone.message}</span>}
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Changing these does not affect existing payments, subscriptions, or attendance records —
        only new activity going forward.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Staff accounts section
// ---------------------------------------------------------------------------

const emptyStaffValues: StaffCreateValues = { name: "", email: "", password: "", confirmPassword: "" };

function AddStaffForm({ onDone }: { onDone: (message: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<StaffCreateValues>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: emptyStaffValues,
  });

  const onSubmit = (values: StaffCreateValues) =>
    startTransition(async () => {
      setError("");
      const result = await createStaff(values);
      if (!result.success) {
        setError(result.message);
        Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) =>
          setFieldError(field as keyof StaffCreateValues, { message })
        );
        return;
      }
      onDone(result.message);
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <label className="space-y-1 text-sm">
        <span>Name *</span>
        <Input {...register("name")} aria-invalid={Boolean(errors.name)} />
        {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
      </label>
      <label className="space-y-1 text-sm">
        <span>Email *</span>
        <Input type="email" {...register("email")} aria-invalid={Boolean(errors.email)} />
        {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Password *</span>
          <Input type="password" {...register("password")} aria-invalid={Boolean(errors.password)} />
          {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span>Confirm password *</span>
          <Input
            type="password"
            {...register("confirmPassword")}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <span className="text-xs text-destructive">{errors.confirmPassword.message}</span>
          )}
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add staff"}
        </Button>
      </div>
    </form>
  );
}

function EditStaffForm({ staff, onDone }: { staff: Staff; onDone: (message: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<StaffUpdateFormValues>({
    resolver: zodResolver(staffUpdateFormSchema),
    defaultValues: { name: staff.name, email: staff.email, isActive: staff.isActive },
  });

  const onSubmit = (values: StaffUpdateFormValues) =>
    startTransition(async () => {
      setError("");
      const result = await updateStaff({ ...values, id: staff.id });
      if (!result.success) {
        setError(result.message);
        Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) =>
          setFieldError(field as keyof StaffUpdateFormValues, { message })
        );
        return;
      }
      onDone(result.message);
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <label className="space-y-1 text-sm">
        <span>Name *</span>
        <Input {...register("name")} aria-invalid={Boolean(errors.name)} />
        {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
      </label>
      <label className="space-y-1 text-sm">
        <span>Email *</span>
        <Input type="email" {...register("email")} aria-invalid={Boolean(errors.email)} />
        {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} className="size-4" />
        <span>Active</span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function StaffSection({
  staff,
  onDone,
}: {
  staff: Staff[];
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"add" | Staff | null>(null);
  const [staffToDeactivate, setStaffToDeactivate] = useState<Staff | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  const done = (message: string) => {
    setDialog(null);
    setNotice(message);
    onDone(message);
    router.refresh();
  };

  const reactivate = (member: Staff) =>
    startTransition(async () => {
      const result = await reactivateStaff(member.id);
      setNotice(result.message);
      if (result.success) {
        onDone(result.message);
        router.refresh();
      }
    });

  const deactivate = () => {
    if (!staffToDeactivate) return;
    startTransition(async () => {
      const result = await deactivateStaff(staffToDeactivate.id);
      setNotice(result.message);
      if (result.success) {
        setStaffToDeactivate(null);
        onDone(result.message);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Staff Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Accounts your staff use to sign in to GymFlow. Owners aren&apos;t listed here.
          </p>
        </div>
        <Button onClick={() => setDialog("add")}>
          <UserPlus className="size-4" />
          Add staff
        </Button>
      </div>
      <Separator />
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      {staff.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <UserPlus className="text-muted-foreground size-8" />
          <p className="font-medium">No staff accounts yet</p>
          <p className="text-sm text-muted-foreground">Add a staff account to give someone else access.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>
                  <Badge variant={member.isActive ? "success" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(member.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog(member)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      {member.isActive ? (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => setStaffToDeactivate(member)}
                        >
                          <UserX className="size-4" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled={isPending} onClick={() => reactivate(member)}>
                          <UserCheck className="size-4" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "add" ? "Add staff" : "Edit staff"}</DialogTitle>
            <DialogDescription>
              {dialog === "add"
                ? "The new staff member signs in normally with this email and password."
                : "Role changes aren't available here — staff accounts stay STAFF."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            {dialog === "add" ? (
              <AddStaffForm onDone={done} />
            ) : dialog ? (
              <EditStaffForm staff={dialog} onDone={done} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={staffToDeactivate !== null}
        onOpenChange={(open) => !open && !isPending && setStaffToDeactivate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate staff account?</DialogTitle>
            <DialogDescription>
              {staffToDeactivate?.name} won&apos;t be able to sign in until you reactivate this
              account. Their history is preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" disabled={isPending} onClick={() => setStaffToDeactivate(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={deactivate}>
              {isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace shell — left-hand section switcher on desktop, stacked on mobile
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "staff", label: "Staff Accounts", icon: UserPlus },
  { id: "preferences", label: "Preferences", icon: Settings2 },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsWorkspace({
  organization,
  staff,
}: {
  organization: Organization;
  staff: Staff[];
}) {
  const [section, setSection] = useState<SectionId>("organization");
  const [notice, setNotice] = useState("");

  return (
    <div className="flex flex-col sm:flex-row">
      <nav className="flex shrink-0 gap-1 border-b p-3 sm:w-52 sm:flex-col sm:border-r sm:border-b-0">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setNotice("");
              }}
              className={
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
              }
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 p-4 sm:p-6">
        {notice && (
          <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
        )}
        {section === "organization" && (
          <OrganizationSection organization={organization} onDone={setNotice} />
        )}
        {section === "staff" && <StaffSection staff={staff} onDone={setNotice} />}
        {section === "preferences" && (
          <PreferencesSection organization={organization} onDone={setNotice} />
        )}
      </div>
    </div>
  );
}
