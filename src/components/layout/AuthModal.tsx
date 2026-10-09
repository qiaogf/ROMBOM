"use client";

/**
 * 统一认证弹窗 — admin / supplier / customer 三者共用
 * 四个视图：login / register / reset / oneTime
 * 差异仅由 props 注入：提交动作（login/register）与登录成功后的跳转
 */
import { useState } from "react";
import { ModalShell } from "./ModalShell";

export type AuthView = "login" | "register" | "reset" | "oneTime";

export interface AuthSubmitInput {
  email: string;
  password: string;
  name: string;
  stayLoggedIn: boolean;
}

export interface AuthSubmitResult {
  success: boolean;
  message: string;
}

interface AuthModalProps {
  /** label/htmlFor 与 input id 的唯一前缀，如 admin / supplier / customer */
  idPrefix: string;
  initialView?: AuthView;
  login: (input: AuthSubmitInput) => Promise<AuthSubmitResult>;
  register: (input: AuthSubmitInput) => Promise<AuthSubmitResult>;
  /** 登录成功后的行为（关闭弹窗、刷新、跳转由各角色 wrapper 决定） */
  onLoginSuccess: () => void;
  onClose: () => void;
}

const inputClass =
  "w-full border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";
const labelClass = "block text-[11px] font-semibold text-slate-700 mb-0";
const linkClass = "text-[11px] text-[#336633] hover:underline cursor-pointer bg-transparent border-0 p-0 text-left";
const primaryBtnClass =
  "w-full py-1.5 rounded bg-[#336633] text-white text-[12px] font-bold tracking-wide hover:bg-[#2d5a2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

/** admin / supplier 的 Server Action 接收 FormData，统一转换 */
export const authInputToFormData = (input: AuthSubmitInput): FormData => {
  const fd = new FormData();
  fd.set("email", input.email);
  fd.set("password", input.password);
  fd.set("name", input.name);
  return fd;
};

const TITLES: Record<AuthView, string> = {
  login: "Log in",
  register: "Register",
  reset: "Reset Password",
  oneTime: "Log In with a One-Time Code",
};

export function AuthModal({
  idPrefix,
  initialView = "login",
  login,
  register: registerAction,
  onLoginSuccess,
  onClose,
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const switchView = (v: AuthView) => {
    setView(v);
    setError("");
    setNotice("");
  };

  const submit = async (kind: "login" | "register") => {
    setError("");
    if (!email.trim() || !password || (kind === "register" && !name.trim())) {
      setError(
        kind === "login"
          ? "Please enter your email and password."
          : "Please enter your name, email, and password."
      );
      return;
    }
    setBusy(true);
    try {
      const action = kind === "login" ? login : registerAction;
      const res = await action({ email: email.trim(), password, name: name.trim(), stayLoggedIn });
      if (res.success) {
        if (kind === "login") {
          onLoginSuccess();
        } else {
          setPassword("");
          setName("");
          setNotice("Registration successful! Please log in with your new credentials.");
          setView("login");
        }
      } else {
        setError(res.message);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <ModalShell title={TITLES[view]} onClose={onClose}>
      {/* ── Log in ── */}
      {view === "login" && (
        <div>
          <div className="mb-1">
            <label htmlFor={id("login-email")} className={labelClass}>Email</label>
            <input
              id={id("login-email")}
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div className="mb-1">
            <label htmlFor={id("login-password")} className={labelClass}>Password</label>
            <div className="relative">
              <input
                id={id("login-password")}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`${inputClass} pr-14`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#336633] hover:underline"
              >
                {showPw ? "hide" : "show"}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 mb-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
              className="w-4 h-4 accent-[#336633]"
            />
            <span className="text-[13px] text-slate-700">Stay logged in</span>
          </label>

          {error && <p className="mb-1 text-xs text-rose-600" role="alert">{error}</p>}
          {notice && <p className="mb-1 text-xs text-[#336633]" role="status">{notice}</p>}

          <button type="button" onClick={() => void submit("login")} disabled={busy} className={primaryBtnClass}>
            {busy ? "Logging in..." : "Log In"}
          </button>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button type="button" onClick={() => switchView("reset")} className={linkClass}>
              Reset Password
            </button>
            <button type="button" onClick={() => switchView("oneTime")} className={linkClass}>
              Log In with a One-Time Code
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { switchView("register"); setPassword(""); }} className={linkClass}>
              Register
            </button>
          </div>
        </div>
      )}

      {/* ── Register ── */}
      {view === "register" && (
        <div>
          <div className="mb-1">
            <label htmlFor={id("reg-name")} className={labelClass}>Name</label>
            <input
              id={id("reg-name")}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
              autoComplete="name"
              required
            />
          </div>

          <div className="mb-1">
            <label htmlFor={id("reg-email")} className={labelClass}>Email</label>
            <input
              id={id("reg-email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className={inputClass}
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-1">
            <label htmlFor={id("reg-password")} className={labelClass}>Password</label>
            <div className="relative">
              <input
                id={id("reg-password")}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`${inputClass} pr-14`}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#336633] hover:underline"
              >
                {showPw ? "hide" : "show"}
              </button>
            </div>
          </div>

          {error && <p className="mb-1 text-xs text-rose-600" role="alert">{error}</p>}
          {notice && <p className="mb-1 text-xs text-[#336633]" role="status">{notice}</p>}

          <button type="button" onClick={() => void submit("register")} disabled={busy} className={primaryBtnClass}>
            {busy ? "Creating account..." : "Register"}
          </button>

          <div className="mt-2">
            <button type="button" onClick={() => switchView("login")} className={linkClass}>
              Back to Log in
            </button>
          </div>
        </div>
      )}

      {/* ── Reset Password ── */}
      {view === "reset" && (
        <div>
          <p className="text-[13px] text-slate-600 mb-1">
            Enter your account email and we will send you a password reset link.
          </p>
          <div className="mb-1">
            <label htmlFor={id("reset-email")} className={labelClass}>Email</label>
            <input
              id={id("reset-email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className={inputClass}
              autoComplete="email"
            />
          </div>

          {notice && <p className="mb-1 text-xs text-[#336633]" role="status">{notice}</p>}
          {error && <p className="mb-1 text-xs text-rose-600" role="alert">{error}</p>}

          <button
            type="button"
            onClick={() =>
              setNotice(
                email.trim()
                  ? `If an account exists for ${email.trim()}, a reset link has been sent.`
                  : "Please enter your email address."
              )
            }
            className={primaryBtnClass}
          >
            Send Reset Link
          </button>

          <div className="mt-2">
            <button type="button" onClick={() => switchView("login")} className={linkClass}>
              Back to Log in
            </button>
          </div>
        </div>
      )}

      {/* ── One-Time Code ── */}
      {view === "oneTime" && (
        <div>
          <p className="text-[13px] text-slate-600 mb-1">
            Enter your account email and we will send you a one-time code to log in.
          </p>
          <div className="mb-1">
            <label htmlFor={id("otc-email")} className={labelClass}>Email</label>
            <input
              id={id("otc-email")}
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className={inputClass}
              autoComplete="off"
            />
          </div>

          {notice && <p className="mb-1 text-xs text-[#336633]" role="status">{notice}</p>}
          {error && <p className="mb-1 text-xs text-rose-600" role="alert">{error}</p>}

          <button
            type="button"
            onClick={() =>
              setNotice(
                email.trim()
                  ? `A one-time code has been sent to ${email.trim()}.`
                  : "Please enter your email address."
              )
            }
            className={primaryBtnClass}
          >
            Send Code
          </button>

          <div className="mt-2">
            <button type="button" onClick={() => switchView("login")} className={linkClass}>
              Back to Log in
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 rounded border border-slate-300 text-slate-700 text-sm font-bold tracking-wide hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}
