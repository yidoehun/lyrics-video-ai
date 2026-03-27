"use client";

import { FormEvent, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSessionChange: (session: Session | null) => void;
};

export default function AuthModal({ open, onClose, onSessionChange }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setMessage("");
      setPassword("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase 환경 변수가 설정되지 않았습니다.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        onSessionChange(data.session);
        setMessage("회원가입이 완료되었습니다. 이메일 인증 후 로그인하세요.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSessionChange(data.session);
        setMessage("로그인 성공");
        onClose();
      }
    } catch (error) {
      setMessage((error as Error).message || "인증 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop">
      <div className="card auth-modal">
        <h3>{mode === "login" ? "로그인" : "회원가입"}</h3>
        <form className="auth-form" onSubmit={submit}>
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>
        {message ? <p className="status-line">{message}</p> : null}
        <div className="auth-switch">
          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "login" ? "signup" : "login"))}
          >
            {mode === "login" ? "계정 만들기" : "로그인으로 전환"}
          </button>
          <span>|</span>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
