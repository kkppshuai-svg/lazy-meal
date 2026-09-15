import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "懒人餐 Agent｜冰箱里有啥，就吃啥",
  description: "拍下冰箱食材，AI 识别库存、推荐能马上做的菜，并记录省下的钱。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
