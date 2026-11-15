import { shareText } from './game.js';

export async function shareResults(state) {
  const text = shareText(state);
  const status = document.querySelector('#share-status');
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: 'Hillion #001', text }); status.textContent = 'Shared. The mystery stays a mystery.'; return; }
    catch (error) { if (error.name === 'AbortError') { status.textContent = 'Share canceled. Your report is ready.'; return; } }
  }
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); status.textContent = 'Copied. Send a little mystery to a friend.';
  } catch {
    const area = document.createElement('textarea'); area.value = text; area.className = 'share-fallback'; area.setAttribute('aria-label', 'Spoiler-free case report');
    document.querySelector('#manual-share').replaceChildren(area); area.focus(); area.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* The selected text is the final fallback. */ }
    if (copied) { area.remove(); status.textContent = 'Copied. Your report has no spoilers.'; }
    else status.textContent = 'Copy the selected report with ⌘C or Ctrl+C.';
  }
}
