import React from "react";
import ReactDOM from "react-dom/client";
import Home from "../app/page";
import AuthGate from "./AuthGate";
import "../app/globals.css";
import "./netlify.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>
      {({ username, logout }) => <>
        <div className="backup-banner" role="status">
          <span>备用站</span>
          <b>{username}</b> 的冰箱正在同步
          <button onClick={logout}>退出</button>
        </div>
        <Home />
      </>}
    </AuthGate>
  </React.StrictMode>,
);
