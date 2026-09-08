"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { loginSchema, type LoginFormState } from "@/lib/validations/auth";

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    const fieldErrors: NonNullable<LoginFormState>["fieldErrors"] = {};
    for (const issue of validated.error.issues) {
      const key = issue.path[0] as "email" | "password" | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = validated.data;

  // NOTE: email is unique per-organization, not globally (see schema.prisma),
  // to support multiple gyms in the future. With only one gym on Day 2,
  // finding the first matching active user is correct. Once a second
  // organization exists, this needs a way to disambiguate which org a
  // login belongs to (e.g. a per-org login URL/slug, or subdomain-based
  // tenant resolution) — deliberately deferred rather than guessed at here.
  const user = await db.user.findFirst({
    where: { email: email.toLowerCase(), isActive: true },
  });

  if (!user) {
    // Same message as a wrong password so login can't be used to enumerate
    // which email addresses exist in the system.
    return { error: "Invalid email or password." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
