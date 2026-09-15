import { useEffect, useState, type ReactNode } from "react";

type User = { id: string; username: string };

export default function AuthGate({ children }: { children: (input: User & { logout: () => Promise<void> }) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth/session").then(async (res) => {
      if (res.ok) setUser((await res.json()).user);
    }).finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirm) { setError("两次密码不一样"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "操作失败");
      setUser(payload.user);
      setPassword(""); setConfirm("");
    } catch (err) { setError(err instanceof Error ? err.message : "网络开小差了"); }
    finally { setLoading(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); setPassword(""); setConfirm(""); setMode("login");
  }

  if (loading && !user) return <main className="auth-shell"><div className="auth-card auth-loading">正在打开冰箱…</div></main>;
  if (user) return children({ ...user, logout });

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="auth-logo">🍳</div>
      <p className="auth-eyebrow">懒人餐 Agent · 备用站</p>
      <h1>{mode === "login" ? "欢迎回来，看看冰箱" : "先领一个自己的冰箱"}</h1>
      <p className="auth-copy">登录后库存、临期提醒和采购单会跟着账号同步。</p>
      <form onSubmit={submit}>
        <label>账号<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–24 位中文、字母或数字" /></label>
        <label>密码<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" /></label>
        {mode === "register" && <label>确认密码<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再输入一次" /></label>}
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" disabled={loading}>{loading ? "稍等一下…" : mode === "login" ? "登录" : "注册并进入"}</button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
        {mode === "login" ? "第一次来？注册账号" : "已经有账号？直接登录"}
      </button>
      <small>请不要复用银行卡、邮箱等重要账号的密码。</small>
    </section>
  </main>;
}
