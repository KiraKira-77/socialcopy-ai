"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Save, Trash2 } from "lucide-react";
import { API_KEY_STORAGE_KEY } from "../../_lib/storage";

type Status = "idle" | "saved" | "cleared";

export default function ApiKeySettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
    setApiKey(stored);
  }, []);

  const handleSave = () => {
    if (typeof window === "undefined") {
      return;
    }
    const trimmed = apiKey.trim();
    if (trimmed) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
      setApiKey(trimmed);
      setStatus("saved");
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKey("");
      setStatus("cleared");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  const handleClear = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey("");
    setStatus("cleared");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const statusMessage =
    status === "saved"
      ? "Saved locally. / 已保存在本地浏览器。"
      : status === "cleared"
        ? "Cleared. / 已清除。"
        : "";

  return (
    <main className="min-h-screen bg-gray-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-300 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          <span>Back to workspace / 返回主面板</span>
        </Link>

        <div className="mt-6 rounded-3xl border border-gray-800 bg-gray-950/70 p-6 shadow-xl shadow-black/30">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100">
              <KeyRound size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                API key settings / API 密钥设置
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                Provide your Google AI Studio API key so Gemini and Imagen requests can run with your own credentials.
                <br />
                输入的密钥仅保存在浏览器 localStorage，留空时会继续使用服务器环境变量。
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <label className="text-xs uppercase tracking-widest text-gray-400">
              Google AI key / Google AI 密钥
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              className="w-full rounded-2xl border border-gray-700 bg-black/40 p-4 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none"
            />
            <p className="text-xs text-gray-500">
              Keys stay inside this browser’s localStorage. When empty, the app falls back to the server-side GEMINI_API_KEY。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-400 bg-amber-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              <Save size={16} />
              <span>Save / 保存</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-700 px-5 py-2 text-sm text-gray-300 transition hover:border-red-400 hover:text-red-300"
            >
              <Trash2 size={16} />
              <span>Clear / 清除</span>
            </button>
          </div>

          {status !== "idle" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
              <CheckCircle2 size={14} />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
