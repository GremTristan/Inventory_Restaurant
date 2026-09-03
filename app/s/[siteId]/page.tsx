import { redirect } from "next/navigation";
import { pageSite } from "@/lib/page-guards";

export default async function SiteIndexPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user, site } = await pageSite(siteId);
  redirect(user.role === "cook" ? `/s/${site.id}/cuisine` : `/s/${site.id}/service`);
}
