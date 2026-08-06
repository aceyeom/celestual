// CELESTUAL — the mutual DM: one copy, one sender, two callers.
//
// Both halves of the Instagram reveal live here so they can never drift apart:
//
//   • celestual-manychat   the REPLY path. Somebody messaged the account, and
//                          the answer they get back carries their news.
//   • celestual-mutual-dm  the PUSH path. Their 24-hour window is open, so the
//                          news goes now, through ManyChat's sending API.
//
// What the line may say is settled in migration 0023 and docs/STAR-CARDS.md: it
// names the pair, and it says whether a card is waiting. It never carries a
// word of the card. Those words are read once, in the product, by the person
// they were written to.

const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

export type MutualItem = { other: string; has_card: boolean };

// The voice: quiet, literal, no exclamation (docs/VOICE.md §5/§6). "They left a
// card for you" is true only when there is one — a person who placed a ping
// before the card shipped, or chose not to write one, gets the second form.
export function mutualLine(item: MutualItem, site = SITE): string {
  const at = `@${String(item.other ?? '').replace(/^@+/, '')}`;
  return item.has_card
    ? `✦ You and ${at} are mutual. They left a card for you. Read it at ${site}`
    : `✦ You and ${at} are mutual. You each entered the other. It’s waiting at ${site}`;
}

// Several at once is rare but real (two pings resolving while someone was away).
// Three is the ceiling ManyChat's message box is comfortable with; the rest are
// counted, not listed, and stay queued for the app and the email to carry.
export function mutualBlock(items: MutualItem[], more = 0, site = SITE): string {
  const lines = (items ?? []).map((i) => mutualLine(i, site));
  if (lines.length === 0) return '';
  if (more > 0) lines.push(`And ${more} more waiting for you at ${site}`);
  return lines.join('\n\n');
}

// ManyChat's sending API. The subscriber id is ManyChat's own contact id, which
// it hands us on every relayed message and which we store per handle.
//
// NO message_tag, deliberately. Tags are the documented way to message somebody
// outside the 24-hour window, and none of them covers this: the four standard
// tags are for account updates, purchases and confirmed events, and HUMAN_AGENT
// is for a human answering a person, which an automation is not. The caller
// (celestual_dm_due) has already established that this contact's window is
// open, so this is an ordinary reply inside it and needs no tag at all.
export async function sendManyChat(
  token: string,
  subscriberId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://api.manychat.com/fb/sending/sendContent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscriber_id: subscriberId,
      data: {
        version: 'v2',
        content: {
          type: 'instagram',
          messages: [{ type: 'text', text }],
          actions: [],
          quick_replies: [],
        },
      },
    }),
  });

  const body = await res.text();
  if (!res.ok) return { ok: false, error: `manychat ${res.status}: ${body.slice(0, 300)}` };
  // ManyChat answers 200 with {"status":"success"} — or, for a closed window and
  // other refusals, {"status":"error","message":"…"}. Both shapes are 200, so
  // the status field is the real result.
  try {
    const parsed = JSON.parse(body);
    if (parsed?.status !== 'success') {
      return { ok: false, error: `manychat ${parsed?.status ?? 'unknown'}: ${String(parsed?.message ?? body).slice(0, 300)}` };
    }
  } catch {
    return { ok: false, error: `manychat unparseable: ${body.slice(0, 300)}` };
  }
  return { ok: true };
}
