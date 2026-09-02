import Link from "next/link";
import type { Tenant } from "@/types";

export const PRODUCT_NAME = "Crêpo";

export function BrandMark({ tenant, href = "/", className = "" }: { tenant?: Tenant | null; href?: string; className?: string }) {
  const name = tenant?.name ?? PRODUCT_NAME;
  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
      {tenant?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="truncate text-[17px] font-bold tracking-tight text-foreground">{name}</span>
    </Link>
  );
}

export function BrandScope({ tenant, children }: { tenant: Tenant | null; children: React.ReactNode }) {
  const color = tenant?.brandColor && /^#[0-9a-f]{6}$/i.test(tenant.brandColor) ? tenant.brandColor : null;
  if (!color) return <>{children}</>;
  return (
    <div data-brand="" style={{ ["--brand" as string]: color }} className="contents">
      {children}
    </div>
  );
}
