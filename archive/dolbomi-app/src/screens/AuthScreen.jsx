// Auth — intentionally minimal: email + password only. Everything about the
// soldier (군별, 부대, 병과, 복무 기간, 관심사, 수호신) is collected by the
// guided onboarding wizard right after the account exists.
import { useState } from 'react';
import { Btn } from '../components/ui';
import { GUARDIAN_ART } from '../assets/manifest';
import { useStore } from '../store';

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 13 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--sub)', letterSpacing: '.02em', margin: '0 2px 8px' }}>{label}</span>
      {children}
    </label>
  );
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12, border: 'none',
  background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--ink)',
  fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
};

export function AuthScreen() {
  const signIn = useStore((s) => s.signIn);
  const signUp = useStore((s) => s.signUp);
  const authError = useStore((s) => s.authError);
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isSignup = mode === 'signup';
  const ready = email.trim() && password.length >= 6;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    if (isSignup) await signUp({ email: email.trim(), password });
    else await signIn(email.trim(), password);
    setBusy(false);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 26px 32px' }}>
        <div style={{ marginBottom: 30 }}>
          <img src={GUARDIAN_ART.haechi} alt="" draggable={false}
            style={{ width: 92, height: 92, objectFit: 'contain', marginBottom: 18, userSelect: 'none' }} />
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.16 }}>
            우리<br />억울하지 말자.
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 10, lineHeight: 1.55 }}>
            {isSignup
              ? '계정을 만들면 1분 설정이 이어져요. 관심사에 맞춰 퀘스트가 추천돼요.'
              : '18개월을 버린 시간으로 만들지 않아요 · DOLBOMI'}
          </p>
        </div>

        <Field label="이메일">
          <input style={inputStyle} type="email" autoComplete="email" inputMode="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="비밀번호 (6자 이상)">
          <input style={inputStyle} type="password" autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>

        {authError && (
          <div style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(var(--accent-rgb),.1)', borderRadius: 10,
            padding: '10px 12px', marginBottom: 12, lineHeight: 1.4, boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.26)' }}>{authError}</div>
        )}

        <div style={{ marginTop: 8 }}>
          <Btn onClick={submit} style={{ opacity: ready && !busy ? 1 : 0.45 }}>
            {busy ? '잠시만요…' : isSignup ? '계정 만들기' : '로그인'}
          </Btn>
        </div>

        <button onClick={() => setMode(isSignup ? 'signin' : 'signup')} className="tm-tap"
          style={{ marginTop: 20, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12.5, color: 'var(--sub)', textAlign: 'center' }}>
          {isSignup ? '이미 계정이 있어요 · ' : '처음이신가요? · '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{isSignup ? '로그인' : '계정 만들기'}</span>
        </button>
      </div>
    </div>
  );
}
