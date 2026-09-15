import { ArrowLeft, Cloud, Download, LogIn, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { getD1 } from "@/db";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "@/app/chatgpt-auth";
import AccountActions from "./account-actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getChatGPTUser();
  if (!user) return <main className="legal-shell account-shell"><Link className="back-link" href="/"><ArrowLeft size={17} /> 回到冰箱</Link><section className="account-hero"><span className="account-icon"><UserRound size={30} /></span><p className="eyebrow">跨设备同步</p><h1>登录后，冰箱不会<br />留在这台设备里。</h1><p>库存、采购单和省钱记录会跟着账号走。登录前的数据也会自动并入。</p><a className="account-primary" href={chatGPTSignInPath("/account")} target="_top"><LogIn size={18} /> 使用 ChatGPT 登录</a><small>我们只读取登录邮箱和昵称，不会读取你的对话。</small></section></main>;

  const ownerId = `user:${user.email.toLowerCase()}`;
  await getD1().prepare(`INSERT INTO user_profiles (owner_id, email, display_name, created_at, last_seen_at)
    VALUES (?, ?, ?, unixepoch() * 1000, unixepoch() * 1000) ON CONFLICT(owner_id) DO UPDATE SET display_name = excluded.display_name, last_seen_at = excluded.last_seen_at`)
    .bind(ownerId, user.email.toLowerCase(), user.displayName).run();
  const [inventory, scans, stats] = await Promise.all([
    getD1().prepare("SELECT COUNT(*) AS count FROM inventory_items WHERE owner_id = ? AND status = 'active'").bind(ownerId).first(),
    getD1().prepare("SELECT COUNT(*) AS count FROM scan_events WHERE owner_id = ? AND status = 'success'").bind(ownerId).first(),
    getD1().prepare("SELECT total_saved AS totalSaved, meals_cooked AS mealsCooked FROM user_stats WHERE owner_id = ?").bind(ownerId).first(),
  ]);
  const isAdmin = process.env.ADMIN_EMAIL?.toLowerCase() === user.email.toLowerCase();
  return <main className="legal-shell account-shell"><Link className="back-link" href="/"><ArrowLeft size={17} /> 回到冰箱</Link><section className="account-hero signed"><span className="account-icon"><ShieldCheck size={30} /></span><p className="eyebrow">账号已连接</p><h1>{user.fullName || "你的冰箱"}</h1><p>{user.email}</p><div className="account-stats"><span><b>{Number(inventory?.count || 0)}</b>样库存</span><span><b>{Number(scans?.count || 0)}</b>次识别</span><span><b>¥{Number(stats?.totalSaved || 0)}</b>累计省下</span></div><div className="account-note"><Cloud size={18} /><span>换设备登录后，库存和采购单会自动同步。</span></div><AccountActions signOutPath={chatGPTSignOutPath("/")} /></section><section className="account-links"><a href="/api/account"><Download size={17} /> 导出我的全部数据</a>{isAdmin && <Link href="/admin">内测数据后台</Link>}<Link href="/privacy">隐私说明</Link><Link href="/terms">使用条款</Link></section></main>;
}
