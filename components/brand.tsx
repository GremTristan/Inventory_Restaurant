import Link from "next/link";
import type { Tenant } from "@/types";

export const PRODUCT_NAME = "Crêpo";

// Displays the customer's own brand when a tenant is known (white-label),
// the product's otherwise (marketing, sign-in).
export function BrandMark({ tenant, href = "/", className = "" }: { tenant?: Tenant | null; href?: string; className?: string }) {
  const name = tenant?.name ?? PRODUCT_NAME;
  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
      {tenant?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="truncate text-base font-bold text-foreground">{name}</span>
    </Link>
  );
}

// Sets the accent colour for everything rendered inside.
export function BrandScope({ tenant, children }: { tenant: Tenant | null; children: React.ReactNode }) {
  const color = tenant?.brandColor && /^#[0-9a-f]{6}$/i.test(tenant.brandColor) ? tenant.brandColor : null;
  if (!color) return <>{children}</>;
  return (
    <div data-brand="" style={{ ["--brand" as string]: color }} className="contents">
      {children}
    </div>
  );
}
