"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationDot } from "@/components/ui/notification-dot";
import type { User } from "@/types";

const INITIAL_STATE: LoginState = {};

export function LoginUserList({
  users,
  pendingUserIds,
}: {
  users: User[];
  // ids of users whose "Ventes du jour"/"Inventaire" reminder is pending —
  // drives the notification dot next to their name, same as before.
  pendingUserIds: Set<string>;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [state, formAction] = useActionState(loginAction, INITIAL_STATE);

  if (selectedUser) {
    return (
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="userId" value={selectedUser.id} />
        <p className="text-sm font-medium text-foreground">{selectedUser.name}</p>
        <Input
          name="password"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Code PIN"
          autoFocus
          required
        />
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        <Button type="submit" variant="primary" className="w-full justify-center">
          Se connecter
        </Button>
        <button
          type="button"
          onClick={() => setSelectedUser(null)}
          className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          ← Autre utilisateur
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((user) => (
        <Button
          key={user.id}
          type="button"
          variant="secondary"
          className="relative w-full justify-center"
          onClick={() => setSelectedUser(user)}
        >
          {user.name}
          {pendingUserIds.has(user.id) && <NotificationDot />}
        </Button>
      ))}
    </div>
  );
}
