import { NextResponse } from "next/server";
import { getD1 } from "@/db";
import { clientHash } from "@/lib/events";
import { resolveOwner, withOwnerCookie } from "@/lib/owner";

export const runtime = "edge";

const MODEL = process.env.VISION_MODEL || "deepseek-v4-flash-vision-exp";
const BASE_URL = (process.env.VISION_API_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");

const systemPrompt = `你是“懒人餐 Agent”的视觉食材分析器。你的工作是：
1. 只识别图片里确实可见、可食用的食材，给出保守数量；
2. 观察萎蔫、变色、碰伤、霉斑、包装鼓包等可见状态，但绝不声称能仅凭照片判断食品安全；
3. estimated_days 是冷藏条件下建议再次检查/优先吃掉的天数，不是绝对保质期；
4. 推荐 3 道中国年轻人在出租屋能完成的简单菜，优先消耗状态较差和已经开封的食材，默认用户有油盐、生抽和水；
5. 按用户本次饮食目标调整一人份用量、烹饪方式和蛋白质优先级；不得编造图片里没有的主食材。省钱金额按少点一次外卖估算；
6. 为每道菜给出一人份 calories、protein、oilGrams，以及 nutrition 食材克数清单。nutrition 只列实际下锅的主要食材，不列油盐、水和调味品；grams 是可食部分的合理估算。客户端会优先用食材克数和营养数据重新计算，因此克数必须与步骤和目标份量一致。所有数值只作日常参考，不作为医疗或精确营养建议。

只返回 JSON，不要 Markdown。格式：
{"summary":"短句","items":[{"name":"番茄","amount":"2 个","freshness":"尽快吃|还新鲜|耐放","emoji":"🍅","category":"蔬菜|水果|蛋白质|冷藏|主食|其他","condition":"可见状态短句","confidence":0.0,"estimated_days":2}],"recipes":[{"name":"菜名","subtitle":"一句话","time":12,"difficulty":"很简单","uses":["食材"],"missing":["缺少食材"],"saved":28,"calories":520,"protein":25,"nutrition":[{"name":"熟米饭","grams":200},{"name":"鸡蛋","grams":100},{"name":"番茄","grams":150}],"oilGrams":8,"goalNote":"为什么适合当前目标","steps":["步骤1","步骤2","步骤3"],"color":"tomato|mint|lemon","emoji":"🍅"}],"safety_note":"视觉只能辅助判断；异味、发黏、霉变或包装异常时不要食用。"}`;

const missingKeyMessage = "真实识别尚未启用：需要配置 DeepSeek API Key。照片没有被识别，也不会用示例结果替代。";

function cleanJson(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function json(data: unknown, cookie: string | null, init?: ResponseInit) {
  return withOwnerCookie(NextResponse.json(data, init), cookie);
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.DEEPSEEK_API_KEY || process.env.VISION_API_KEY),
    provider: "DeepSeek",
    model: MODEL,
  });
}

export async function POST(request: Request) {
  const { ownerId, cookie } = resolveOwner(request);
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VISION_API_KEY;
  if (!apiKey) return json({ error: missingKeyMessage, code: "MODEL_NOT_CONFIGURED" }, cookie, { status: 503 });

  const body = await request.json();
  const goal = body.goal === "cut" || body.goal === "gain" ? body.goal : "daily";
  const goalInstruction = goal === "cut"
    ? "减脂：少油，控制精制主食份量，优先蔬菜和蛋白质，不做极端节食建议"
    : goal === "gain"
      ? "增肌：提高蛋白质和主食份量，优先训练后容易完成的一人份，不夸大效果"
      : "日常：均衡、简单并优先清理库存";
  if (typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
    return json({ error: "请上传有效图片" }, cookie, { status: 400 });
  }

  const fingerprint = await clientHash(request);
  const since = Date.now() - 86_400_000;
  const [ownerUsage, clientUsage] = await Promise.all([
    getD1().prepare("SELECT COUNT(*) AS count FROM scan_events WHERE owner_id = ? AND created_at >= ?").bind(ownerId, since).first(),
    getD1().prepare("SELECT COUNT(*) AS count FROM scan_events WHERE client_hash = ? AND created_at >= ?").bind(fingerprint, since).first(),
  ]);
  const signedIn = ownerId.startsWith("user:");
  const ownerLimit = signedIn ? 50 : 12;
  if (Number(ownerUsage?.count || 0) >= ownerLimit || Number(clientUsage?.count || 0) >= 60) {
    return json({ error: signedIn ? "今天已经识别很多次啦，24 小时后额度会自动恢复。" : "今日免费识别次数已用完，登录后每天可识别 50 次。", code: "DAILY_LIMIT" }, cookie, { status: 429 });
  }

  const scanId = crypto.randomUUID();
  const startedAt = Date.now();
  await getD1().prepare(`INSERT INTO scan_events
    (id, owner_id, client_hash, status, model, item_count, latency_ms, created_at)
    VALUES (?, ?, ?, 'started', ?, 0, 0, ?)`)
    .bind(scanId, ownerId, fingerprint, MODEL, startedAt).run();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 3000,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            { type: "text", text: `分析这张冰箱或食材照片，给出库存与今晚菜谱。当前饮食目标：${goalInstruction}。按一人份估算热量和蛋白质。` },
            { type: "image_url", image_url: { url: body.image, detail: "original" } },
          ] },
        ],
      }),
    });
  } catch {
    await getD1().prepare("UPDATE scan_events SET status = 'failed', error_code = 'NETWORK', latency_ms = ? WHERE id = ?")
      .bind(Date.now() - startedAt, scanId).run();
    return json({ error: "识别服务暂时连不上，请稍后再试", code: "NETWORK" }, cookie, { status: 502 });
  }

  const payload = await response.json();
  if (!response.ok) {
    await getD1().prepare("UPDATE scan_events SET status = 'failed', error_code = ?, latency_ms = ? WHERE id = ?")
      .bind(`MODEL_${response.status}`, Date.now() - startedAt, scanId).run();
    return json({ error: payload?.error?.message || "模型暂时没有响应" }, cookie, { status: response.status });
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    await getD1().prepare("UPDATE scan_events SET status = 'failed', error_code = 'EMPTY', latency_ms = ? WHERE id = ?")
      .bind(Date.now() - startedAt, scanId).run();
    return json({ error: "模型返回为空" }, cookie, { status: 502 });
  }

  try {
    const parsed = JSON.parse(cleanJson(content));
    if (!Array.isArray(parsed.items) || !parsed.items.length || !Array.isArray(parsed.recipes) || !parsed.recipes.length) {
      throw new Error("invalid shape");
    }
    await getD1().prepare("UPDATE scan_events SET status = 'success', item_count = ?, latency_ms = ? WHERE id = ?")
      .bind(parsed.items.length, Date.now() - startedAt, scanId).run();
    return json({ ...parsed, goal, provider: "DeepSeek", model: MODEL }, cookie);
  } catch {
    await getD1().prepare("UPDATE scan_events SET status = 'failed', error_code = 'INVALID_JSON', latency_ms = ? WHERE id = ?")
      .bind(Date.now() - startedAt, scanId).run();
    return json({ error: "模型结果格式不完整，请重新拍一张更清晰的照片" }, cookie, { status: 502 });
  }
}
