// Real share behaviour (LOGIC-GAPS J4). Uses the Web Share API where available
// (mobile → native share sheet incl. KakaoTalk), falling back to the clipboard.
export async function share(text, title = 'DOLBOMI') {
  const url = (typeof location !== 'undefined' && location.origin) ? location.origin : 'https://dolbomi.app';
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${text} ${url}`);
      return 'copied';
    }
  } catch { /* user cancelled or unsupported */ }
  return false;
}
