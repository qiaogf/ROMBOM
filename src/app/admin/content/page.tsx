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
  // 仅超级管理员可进入（普通管理员侧栏无入口，直接访问同样拦截）
  if (!isSuperAdminEmail(session.email)) redirect("/admin");

  const sp = await searchParams;
  const tab: ContentKey = isContentKey(sp.tab) ? sp.tab : "about";

  const [about, terms] = await Promise.all([getPage("about"), getPage("terms")]);

  return (
    <div className="max-w-[1600px]">
      <h1 className="text-[20px] font-bold text-slate-900 mb-3">Content</h1>
      <ContentEditor
        initialTab={tab}
        initial={{
          about: { value: about.value, updatedAt: about.updatedAt },
          terms: { value: terms.value, updatedAt: terms.updatedAt },
        }}
      />
    </div>
  );
}
