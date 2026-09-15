import { ArrowLeft, BarChart3, Clock3, MessageCircle, ScanLine, Users } from "lucide-react";
import Link from "next/link";
import { getD1 } from "@/db";
import { requireChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!process.env.ADMIN_EMAIL || user.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
    return <main className="legal-shell"><Link className="back-link" href="/"><ArrowLeft size={17} /> 返回</Link><section className="account-hero"><h1>这里是内测后台</h1><p>当前账号没有查看权限。</p></section></main>;
  }
  const [profiles, activity, scans, saved, meals, returners, feedbackCount, recentFeedback] = await Promise.all([
    getD1().prepare("SELECT COUNT(*) AS count FROM user_profiles").first(),
    getD1().prepare("SELECT COUNT(DISTINCT owner_id) AS count FROM product_events WHERE created_at >= (unixepoch() - 604800) * 1000").first(),
    getD1().prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
      AVG(CASE WHEN status = 'success' THEN latency_ms END) AS latency FROM scan_events WHERE created_at >= (unixepoch() - 604800) * 1000`).first(),
    getD1().prepare("SELECT COUNT(*) AS count FROM product_events WHERE event_name = 'inventory_saved' AND created_at >= (unixepoch() - 604800) * 1000").first(),
    getD1().prepare("SELECT COUNT(*) AS count FROM product_events WHERE event_name = 'meal_completed' AND created_at >= (unixepoch() - 604800) * 1000").first(),
    getD1().prepare(`SELECT COUNT(*) AS count FROM (SELECT owner_id FROM product_events WHERE event_name = 'app_open'
      GROUP BY owner_id HAVING COUNT(DISTINCT date(created_at / 1000, 'unixepoch')) >= 2)`).first(),
    getD1().prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'new'").first(),
    getD1().prepare("SELECT kind, content, contact, created_at AS createdAt FROM feedback ORDER BY created_at DESC LIMIT 12").all(),
  ]);
  const totalScans = Number(scans?.total || 0); const successful = Number(scans?.success || 0);
  const feedbackRows = recentFeedback.results as Array<Record<string, unknown>>;
  return <main className="legal-shell admin-shell"><a className="back-link" href="/account"><ArrowLeft size={17} /> 返回账号</a><header className="legal-heading"><span><BarChart3 size={24} /></span><p className="eyebrow">最近 7 天</p><h1>内测有没有<br />真的用起来？</h1></header><section className="admin-grid"><article><Users /><span>注册账号</span><b>{Number(profiles?.count || 0)}</b><small>累计</small></article><article><Users /><span>活跃用户</span><b>{Number(activity?.count || 0)}</b><small>近 7 天</small></article><article><ScanLine /><span>真实识别</span><b>{successful}</b><small>成功率 {totalScans ? Math.round(successful / totalScans * 100) : 0}%</small></article><article><Clock3 /><span>平均耗时</span><b>{Math.round(Number(scans?.latency || 0) / 1000)}s</b><small>成功请求</small></article><article><BarChart3 /><span>存入库存</span><b>{Number(saved?.count || 0)}</b><small>识别后动作</small></article><article><BarChart3 /><span>完成做饭</span><b>{Number(meals?.count || 0)}</b><small>近 7 天</small></article><article><Users /><span>回访用户</span><b>{Number(returners?.count || 0)}</b><small>至少打开 2 天</small></article><article><MessageCircle /><span>待看反馈</span><b>{Number(feedbackCount?.count || 0)}</b><small>累计未处理</small></article></section><section className="admin-funnel"><h2>核心漏斗</h2><div><span>发起识别 <b>{totalScans}</b></span><span>识别成功 <b>{successful}</b></span><span>存入库存 <b>{Number(saved?.count || 0)}</b></span><span>完成做饭 <b>{Number(meals?.count || 0)}</b></span></div></section><section className="feedback-feed"><h2>用户刚刚说了什么</h2>{feedbackRows.length ? feedbackRows.map((item, index) => <article key={`${item.createdAt}-${index}`}><span>{item.kind === "bug" ? "问题" : item.kind === "idea" ? "建议" : "其他"}</span><p>{String(item.content)}</p><small>{item.contact ? `联系方式：${item.contact}` : "匿名反馈"}</small></article>) : <p className="muted">还没有反馈，先去找第一批用户。</p>}</section></main>;
}
