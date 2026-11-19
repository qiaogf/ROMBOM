import { redirect } from "next/navigation";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";
import { getPage, isContentKey, type ContentKey } from "@/lib/content";
import { ContentEditor } from "./_components/ContentEditor";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/auth/admin-login");
  // Super admin only: hidden from nav for other admins, direct access redirected
  if (!isSuperAdminEmail(session.email)) redirect("/admin");

  const sp = await searchParams;
  const tab: ContentKey = isContentKey(sp.tab) ? sp.tab : "about";

  const [about, terms] = await Promise.all([getPage("about"), getPage("terms")]);

  return (
    <div className="max-w-[1600px]">
      <ContentEditor
        initialTab={tab}
        initial={{
          about: { value: about.value },
          terms: { value: terms.value },
        }}
      />
    </div>
  );
}
