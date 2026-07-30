"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getAuthUserById } from "@/lib/user-store";
import { createSession, destroySession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const userId = formData.get("userId");
  const pin = formData.get("password");

  if (typeof userId !== "string" || typeof pin !== "string") {
    return { error: "Code incorrect" };
  }

  const authUser = await getAuthUserById(userId);
  if (!authUser || !bcrypt.compareSync(pin, authUser.passwordHash)) {
    return { error: "Code incorrect" };
  }

  await createSession(userId);

  redirect(authUser.role === "director" ? "/dashboard" : `/inventory/${authUser.siteId}`);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
