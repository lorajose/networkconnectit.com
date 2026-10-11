import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shared Design | NetworkConnectIT",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default function SharedDesignPage({ params }: { params: { token: string } }) {
  const token = encodeURIComponent(params.token);
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">NetworkConnectIT</p>
          <h1 className="mt-2 text-2xl font-semibold">Shared design</h1>
          <p className="mt-2 text-sm text-slate-400">Read-only client view. Internal tenant identifiers, notes and pricing are not exposed.</p>
        </header>
        <section id="share-shell" className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-token={token}>
          <form id="share-password-form" className="flex max-w-lg gap-2">
            <input id="share-password" name="password" type="password" autoComplete="current-password" placeholder="Password, if required" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950" type="submit">Open design</button>
          </form>
          <p id="share-status" className="mt-4 text-sm text-slate-400">Loading shared design…</p>
          <div id="share-content" className="mt-6 hidden space-y-5" />
        </section>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
(() => {
  const token = document.getElementById('share-shell').dataset.token;
  const form = document.getElementById('share-password-form');
  const input = document.getElementById('share-password');
  const status = document.getElementById('share-status');
  const content = document.getElementById('share-content');
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  async function load(password) {
    status.textContent = 'Loading shared design…';
    content.classList.add('hidden');
    const response = await fetch('/api/public/design-shares/' + token, password ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,event:'VIEW'})} : {cache:'no-store'});
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) { status.textContent = 'This share is unavailable or requires the correct password.'; return; }
    const share = body.share;
    status.textContent = 'Shared design loaded.';
    const floors = (share.model.floors || []).map(f => '<li>' + esc(f.name) + ' — ' + esc(f.deviceCount) + ' devices</li>').join('');
    const bom = (share.model.bom || []).map(i => '<li>' + esc(i.description) + ' × ' + esc(i.quantity) + ' ' + esc(i.unit) + '</li>').join('');
    const cables = (share.model.cableSchedule || []).map(i => '<li>' + esc(i.description) + ' — ' + esc(i.quantityFeet) + ' ft</li>').join('');
    content.innerHTML = '<div><h2 class="text-lg font-semibold">Design package</h2><p class="mt-1 text-xs text-slate-400">Report version ' + esc(share.reportVersion) + '</p></div>' +
      (floors ? '<section><h3 class="font-medium">Floor plans / coverage</h3><ul class="mt-2 space-y-1 text-sm text-slate-300">' + floors + '</ul></section>' : '') +
      (bom ? '<section><h3 class="font-medium">Bill of materials</h3><ul class="mt-2 space-y-1 text-sm text-slate-300">' + bom + '</ul></section>' : '') +
      (cables ? '<section><h3 class="font-medium">Cable schedule</h3><ul class="mt-2 space-y-1 text-sm text-slate-300">' + cables + '</ul></section>' : '');
    content.classList.remove('hidden');
  }
  form.addEventListener('submit', e => { e.preventDefault(); load(input.value); });
  load('');
})();` }} />
    </main>
  );
}
