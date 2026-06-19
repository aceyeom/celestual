// screen-ai.jsx — 분대장 AI companion chat + Sunday Letter entry.
(function () {
const { Ic, Card } = window.TU;
const T = window.DOLBOMI;

function AIScreen({ onOpenLetter }) {
  const [msgs, setMsgs] = React.useState(T.aiSeed.map((m, i) => ({ ...m, id: 'seed' + i })));
  const [replies, setReplies] = React.useState(T.aiReplies);
  const [typing, setTyping] = React.useState(false);
  const endRef = React.useRef(null);

  React.useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs, typing]);

  const send = (text) => {
    setReplies([]);
    setMsgs((m) => [...m, { id: 'u' + Date.now(), from: 'me', text }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const ans = T.aiAnswers[text] || '기록은 거짓말 안 한다. 내일 또 보자.';
      setMsgs((m) => [...m, { id: 'a' + Date.now(), from: 'ai', text: ans }]);
    }, 1100);
  };

  return (
    <div className="tm-rise" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* AI identity */}
      <Card pad={15} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(145deg,var(--card2),var(--card))', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>분대장 AI</div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>말년 병장 · 지난 14일을 기억한다</div>
        </div>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--olive)', boxShadow: '0 0 8px var(--olive)' }} />
      </Card>

      {/* Sunday Letter */}
      <Card onClick={onOpenLetter} pad={14} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.22)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'rgba(var(--accent-rgb),.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✉️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>일요일 편지 · 감정 결산</div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)' }}>이번 주 너를 객관적으로 — 도착함</div>
        </div>
        {Ic('chevR', { size: 18, color: 'var(--faint)' })}
      </Card>

      {/* conversation */}
      <div ref={endRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 }}>
        {msgs.map((m) => <Bubble key={m.id} m={m} />)}
        {typing && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--card)', boxShadow: 'inset 0 0 0 1px var(--line)', borderRadius: '16px 16px 16px 5px', padding: '12px 16px', display: 'flex', gap: 4 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--faint)', animation: `tmBlink 1s ${i * 0.2}s infinite` }} />)}
          </div>
        )}
      </div>

      {/* suggested replies / input */}
      <div style={{ paddingTop: 10 }}>
        {replies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {replies.map((r) => (
              <button key={r} onClick={() => send(r)} className="tm-tap" style={{ textAlign: 'left', border: 'none', cursor: 'pointer', background: 'var(--card)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.25)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, padding: '12px 16px', borderRadius: 13 }}>{r}</button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', boxShadow: 'inset 0 0 0 1px var(--line)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--faint)' }}>분대장에게 한 마디…</span>
            <span style={{ color: 'var(--accent)' }}>{Ic('arrowU', { size: 20, color: 'var(--accent)' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ m }) {
  const me = m.from === 'me';
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
      <div style={{
        background: me ? 'var(--accent)' : 'var(--card)', color: me ? '#181206' : 'var(--ink)',
        boxShadow: me ? 'none' : 'inset 0 0 0 1px var(--line)',
        borderRadius: me ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
        padding: '12px 16px', fontSize: 13.5, lineHeight: 1.55, fontWeight: me ? 600 : 400,
      }}>{m.text}</div>
    </div>
  );
}

// Sunday Letter overlay content
function SundayLetter() {
  return (
    <div className="tm-rise">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>✉️</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>일요일 편지</div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 3 }}>5월 4주차 · 너만 보는 기록</div>
      </div>
      <Card pad={22}>
        {[
          ['이번 주의 너는', '대체로 지쳐 있었어. 목요일·금요일 에너지가 바닥이었지. 그래도 7일 중 6일을 채웠다. 무너지지 않은 게 핵심이야.'],
          ['실제로 나아진 것', '전투력이 한 주 만에 +2. 책도 4번 폈고, 정보처리 실기 환경까지 세팅했다. 작아 보여도 쌓이는 중이다.'],
          ['네가 피한 것', '담력. 선임에게 자격증 물어보는 거, 2주째 미루고 있어. 무서운 게 아니라 익숙하지 않은 거다. 다음 주엔 딱 한 번만.'],
        ].map(([h, b], i) => (
          <div key={i} style={{ marginBottom: i < 2 ? 18 : 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, letterSpacing: 0.3 }}>{h}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(236,240,245,.86)' }}>{b}</div>
          </div>
        ))}
      </Card>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--faint)', marginTop: 16, lineHeight: 1.5 }}>지휘계통에 보고되지 않습니다 · 자기 객관화용</div>
    </div>
  );
}

window.AIScreen = AIScreen;
window.SundayLetter = SundayLetter;
})();
