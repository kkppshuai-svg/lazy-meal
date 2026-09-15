"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function AccountActions({ signOutPath }: { signOutPath: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { void fetch("/api/account", { method: "POST" }).then(() => router.refresh()); }, [router]);
  async function removeAccount() {
    setDeleting(true);
    const response = await fetch("/api/account", { method: "DELETE" });
    if (response.ok) window.location.href = signOutPath;
    else setDeleting(false);
  }
  return <div className="account-actions"><Button asChild variant="secondary"><a href={signOutPath} target="_top"><LogOut size={17} /> 退出登录</a></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 size={17} /> 删除账号数据</Button></AlertDialogTrigger><AlertDialogContent className="food-dialog"><AlertDialogHeader><AlertDialogTitle>确认清空全部数据？</AlertDialogTitle><AlertDialogDescription>库存、采购单、识别记录、省钱统计和反馈都会永久删除，无法恢复。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>先不删</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeAccount} disabled={deleting}>{deleting ? "正在删除…" : "确认永久删除"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
