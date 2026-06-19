// Admin review queue — visible only when profiles.role = 'admin'.
// Approving a submission copies it into the shared reference catalog
// (app_review_user_opp), so every soldier sees it on the radar.
import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { Card, Btn, Tag, SectionHeader } from '../components/ui';
import { cats } from '../data';
import { useStore } from '../store';

export function AdminScreen() {
  const listSubmissions = useStore((s) => s.listSubmissions);
  const reviewSubmission = useStore((s) => s.reviewSubmission);
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let on = true;
    listSubmissions().then((r) => { if (on) setRows(r); });
    return () => { on = false; };
  }, [listSubmissions, reloads]);

  const review = async (row, approve) => {
    if (busyId) return;
    setBusyId(row.id);
    await reviewSubmission(row.id, approve);
    setBusyId(null);
    setReloads((n) => n + 1);
  };

  return (
    <div className="tm-rise">
      <SectionHeader caption="장병이 공유 신청한 기회 · 승인하면 전체 레이더에 공개된다">심사 대기</SectionHeader>
      {rows == null && <div style={{ fontSize: 12.5, color: 'var(--faint)', padding: '18px 4px' }}>불러오는 중…</div>}
      {rows != null && rows.length === 0 && (
        <Card pad={20} style={{ textAlign: 'center' }}>
          {Icon('badgeCheck', { size: 22, color: 'var(--positive)', stroke: 2 })}
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>대기 중인 신청이 없어</div>
          <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3 }}>새 신청이 오면 여기에 쌓인다.</div>
        </Card>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {(rows || []).map((row) => {
          const p = row.payload || {};
          const cc = (cats[p.cat] || { c: 'var(--accent)' }).c;
          const steps = (p.milestones || []).flatMap((m) => m.subquests || []);
          const busy = busyId === row.id;
          return (
            <Card key={row.id} pad={15}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: cc, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub)' }}>{p.cat}</span>
                <Tag tone="accent" style={{ marginLeft: 'auto' }}>마감 {p.deadline}</Tag>
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-.01em' }}>{p.title}</div>
              {p.what && <p style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.55, margin: '6px 0 0', textWrap: 'pretty' }}>{p.what}</p>}
              <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 8 }}>
                보상 {p.reward?.finish || '—'} · 단계 {steps.length}개
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '9px 0 13px', paddingLeft: 2 }}>
                {steps.slice(0, 5).map((s) => (
                  <div key={s.id} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, color: 'var(--ink)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--line)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.text}</span>
                    <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--faint)', flexShrink: 0 }}>{s.size}</span>
                  </div>
                ))}
                {steps.length > 5 && <div style={{ fontSize: 11, color: 'var(--faint)' }}>+ {steps.length - 5}개 더</div>}
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                <Btn size="sm" icon="check" onClick={() => review(row, true)} style={{ opacity: busy ? 0.5 : 1 }}>
                  {busy ? '처리 중…' : '승인 · 전체 공개'}
                </Btn>
                <Btn size="sm" tone="ghost" icon="x" onClick={() => review(row, false)} style={{ opacity: busy ? 0.5 : 1 }}>반려</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
