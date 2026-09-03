"use client";

import { useMemo, useState } from "react";
import { ChefHat, HandPlatter, KeyRound, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { ActionButton, AutoSaveForm, CreateForm, DeleteButton } from "@/components/direction/forms";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { deleteStaffAction, resetPinAction, updateStaffAction } from "@/lib/direction-actions";
import { foldSearch } from "@/lib/menu-taxonomy";
import { ROLE_LABELS, type Site, type User } from "@/types";
import { cn } from "@/lib/utils";

export function TeamDirectory({
  staff,
  sites,
}: {
  staff: User[];
  sites: Site[];
}) {
  const [query, setQuery] = useState("");
  const siteName = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);

  const filtered = useMemo(() => {
    const q = foldSearch(query);
    if (!q) return staff;
    return staff.filter((u) => {
      const site = u.siteId ? siteName.get(u.siteId) ?? "" : "";
      return foldSearch(u.name).includes(q) || foldSearch(ROLE_LABELS[u.role]).includes(q) || foldSearch(site).includes(q);
    });
  }, [staff, query, siteName]);

  const bySite = sites
    .map((site) => {
      const members = filtered.filter((u) => u.siteId === site.id);
      const waiters = members.filter((u) => u.role === "waiter");
      const cooks = members.filter((u) => u.role === "cook");
      return { site, waiters, cooks, members };
    })
    .filter((row) => row.members.length > 0);

  return (
    <div>
      <label className="relative mb-5 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un prénom, un rôle, un établissement…"
          className="min-h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>
      <p className="mb-4 text-[12px] text-muted-foreground">
        {filtered.length} personne{filtered.length > 1 ? "s" : ""} · {sites.length} établissement{sites.length > 1 ? "s" : ""}
      </p>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          Personne ne correspond à cette recherche.
        </p>
      ) : (
        bySite.map(({ site, waiters, cooks }) => (
          <section key={site.id} className="mb-8">
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">
              {site.name}
              <span className="ml-2 font-mono text-[12px] font-medium text-muted-foreground">
                {waiters.length + cooks.length}
              </span>
            </h2>
            <RoleGroup title="Service" members={waiters} sites={sites} />
            <RoleGroup title="Cuisine" members={cooks} sites={sites} />
          </section>
        ))
      )}
    </div>
  );
}

function RoleGroup({ title, members, sites }: { title: string; members: User[]; sites: Site[] }) {
  if (members.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {title} · {members.length}
      </h3>
      <ul className="grid gap-3 md:grid-cols-2">
        {members.map((member) => {
          const Icon = member.role === "cook" ? ChefHat : HandPlatter;
          return (
            <li key={member.id} className={cn("rounded-lg border border-border bg-card p-4", !member.active && "opacity-60")}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <AutoSaveForm action={updateStaffAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={member.id} />
                  <Input name="name" defaultValue={member.name} aria-label="Nom" className="min-h-11 min-w-32 flex-1 font-semibold" />
                  <span className="rounded-md bg-muted px-3 py-1.5 text-xs font-semibold">{ROLE_LABELS[member.role]}</span>
                  {sites.length > 1 && (
                    <Select name="siteId" defaultValue={member.siteId ?? ""} aria-label="Établissement" className="min-h-11">
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </AutoSaveForm>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CreateForm action={resetPinAction} submitLabel="Changer le code" className="flex items-center gap-2">
                  <input type="hidden" name="id" value={member.id} />
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <Input name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="Nouveau code" autoComplete="off" className="min-h-11 w-36 text-center tracking-[0.3em]" />
                </CreateForm>
                <ActionButton
                  action={updateStaffAction}
                  fields={{ id: member.id, active: member.active ? "false" : "true" }}
                  message={member.active ? `${member.name} ne peut plus se connecter` : `${member.name} réactivé`}
                  variant="secondary"
                >
                  {member.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {member.active ? "Désactiver" : "Réactiver"}
                </ActionButton>
                <DeleteButton action={deleteStaffAction} fields={{ id: member.id }} message={`${member.name} supprimé`} variant="ghost" size="icon" aria-label="Supprimer" confirmLabel="Supprimer ?">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </DeleteButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
