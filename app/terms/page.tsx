import { AlertTriangle, ArrowLeft } from "lucide-react";

export const metadata = { title: "使用条款｜懒人餐 Agent" };

export default function TermsPage() {
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <main className="legal-shell"><a className="back-link" href="/"><ArrowLeft size={17} /> 返回懒人餐</a><header className="legal-heading"><span><AlertTriangle size={24} /></span><p className="eyebrow">内测使用条款</p><h1>AI 帮你看，<br />最后还得你确认。</h1><p>更新日期：2026 年 8 月 27 日</p></header><section className="legal-card"><h2>食物安全</h2><p>视觉模型无法闻到异味、检查内部腐败或替代包装日期。食材出现霉变、发黏、异味、鼓包或来源不明时，请勿食用。识别结果和期限只是辅助建议。</p></section><section className="legal-card"><h2>内测服务</h2><p>产品仍在内测，模型可能漏认、错认或生成不合适的菜谱。我们会尽力提高可用性，但不保证服务始终不中断，也不承担因忽视食品安全常识导致的损失。</p></section><section className="legal-card"><h2>公平使用</h2><p>每位用户和设备有每日识别额度。请勿自动化刷接口、绕过限流、攻击服务或上传违法内容；严重滥用时我们可以暂停相关访问。</p></section><section className="legal-card"><h2>数据与退出</h2><p>继续使用代表你同意隐私说明。你可以随时导出或删除个人数据；停止使用不会影响你依法享有的权利。</p></section></main>;
}
