import { ArrowLeft, Camera, Database, ShieldCheck } from "lucide-react";

export const metadata = { title: "隐私说明｜懒人餐 Agent" };

export default function PrivacyPage() {
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <main className="legal-shell"><a className="back-link" href="/"><ArrowLeft size={17} /> 返回懒人餐</a><header className="legal-heading"><span><ShieldCheck size={24} /></span><p className="eyebrow">隐私说明</p><h1>照片用来识别，<br />不拿来养数据。</h1><p>更新日期：2026 年 8 月 27 日</p></header><section className="legal-card"><h2><Camera size={19} /> 食材照片</h2><p>你主动上传的照片会被临时发送给 DeepSeek 多模态模型完成食材识别。本站目前不把照片保存到自己的数据库或对象存储中；模型服务商会按照其服务政策处理请求。</p></section><section className="legal-card"><h2><Database size={19} /> 我们保存什么</h2><p>为了提供库存、提醒、采购单和省钱统计，我们会保存结构化食材数据、操作记录、识别成功或失败状态、匿名设备标识，以及你主动提交的反馈。登录后还会保存账号邮箱和昵称，用于跨设备同步。</p></section><section className="legal-card"><h2><ShieldCheck size={19} /> 你的控制权</h2><p>你可以在账号页导出全部个人数据，也可以永久删除账号数据。我们不会出售你的食材数据，不会读取你的 ChatGPT 对话。</p></section><section className="legal-card"><h2>Cookie 与限流</h2><p>未登录时使用必要 Cookie 区分设备、保存库存归属并限制接口滥用。我们会对网络地址做不可直接展示的哈希，用于控制每日识别次数，不保存照片本身。</p></section></main>;
}
