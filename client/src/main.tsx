import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
} catch (error) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Fira Code',monospace;color:#22c55e;background:#0a0a0a;padding:20px">
      <div style="text-align:center;max-width:400px">
        <div style="margin-bottom:12px;font-size:20px">D-Planet</div>
        <div style="margin-bottom:16px;color:#ef4444">読み込みエラーが発生しました</div>
        <button onclick="location.reload()" style="background:#22c55e;color:#0a0a0a;border:none;padding:8px 24px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:14px">
          再読み込み
        </button>
      </div>
    </div>
  `;
}
