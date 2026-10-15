/**
 * Transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email) — plain
 * fetch, no SDK. Used by hubs.ts to deliver a hub's MCP token after a purchase. Never throws: callers
 * record `error` (hubs.email_error) and still answer the request, since the token is also returned once
 * in the response.
 *
 * Config: RESEND_API_KEY (secret) + MAIL_FROM (var, e.g. "Astro Mega <no-reply@your-domain.com>" — the
 * domain must be verified in Resend). Either missing → { ok: false, error: 'not configured' }.
 */
import { SECTORS } from './fn/sectors/index';

export interface EmailEnv {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(env: EmailEnv, mail: Mail): Promise<{ ok: boolean; error?: string }> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return { ok: false, error: 'Email is not configured (RESEND_API_KEY / MAIL_FROM)' };
  if (!mail.to) return { ok: false, error: 'No recipient address' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (res.ok) return { ok: true };
    const detail = await res.text();
    console.error(`[worker-llm/email] Resend ${res.status}: ${detail}`);
    return { ok: false, error: `Resend ${res.status}` };
  } catch (err) {
    console.error('[worker-llm/email] send failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The sectors a hub can use (fn/trial.ts modeOf) — the others only as a trial on /system/<sector>. */
const releasedSectors = () => SECTORS.filter(s => s.released);

/** What a customer drops on their site: the embed bundle (built by vite.standalone.mjs into the site's public/embed/)
 *  + the guest chat of the sector they pick, pinned to this hub's knowledge by `owner`. Only svc-aide is embeddable —
 *  its routes are CORS '*' (lib/cors.ts); the Secretary and the departments (Pro) run in the hosted workspace
 *  /system/<sector>. The purchase doesn't say which sector — the email shows the first open one and lists the rest. */
export const embedSnippet = (owner: string, siteUrl: string, sector = releasedSectors()[0]?.id ?? 'ecommerce') => [
  `<script type="module" src="${siteUrl}/embed/svc-aide.js"></script>`,
  `<svc-aide division="${sector}.consult" owner="${owner}"></svc-aide>`,
].join('\n');

/** The site the emails point at — SITE_URL, else the first ALLOWED_ORIGIN (the production domain). */
export const siteUrlOf = (env: { SITE_URL?: string; ALLOWED_ORIGIN?: string }) =>
  (env.SITE_URL || (env.ALLOWED_ORIGIN ?? '').split(',')[0] || '').trim().replace(/\/$/, '');

/** The "your MCP token" email — English first (site.defaultLang), Vietnamese under each line: token + how to connect +
 *  the embed tags (+ which sector codes are open, and where to pick one); a plan with `departments` (Pro) also gets the
 *  workspace link of every open sector. */
export function mcpTokenMail(opts: { to: string; name: string; token: string; mcpUrl: string; plan: string; rotated: boolean; owner: string; siteUrl: string; departments: boolean }): Mail {
  const { to, name, token, mcpUrl, plan, rotated, owner, siteUrl, departments } = opts;
  const sectors = releasedSectors();
  const embed = embedSnippet(owner, siteUrl, sectors[0]?.id);
  const docsUrl = `${siteUrl}/system/docs`;
  const pickUrl = `${docsUrl}#embed`;
  // One workspace per sector — the customer opens the one of their business.
  const workspaces = sectors.map(s => ({ name: s.name, url: `${siteUrl}/system/${s.id}` }));
  const codes = sectors.map(s => `${s.id}.consult`).join(', ');
  const command = `claude mcp add --transport http astro-knowledge ${mcpUrl} --header "Authorization: Bearer ${token}"`;
  // Every line once in English, then in Vietnamese.
  const t = {
    hello: { en: name ? `Hi ${name},` : 'Hi there,', vi: name ? `Chào ${name},` : 'Chào bạn,' },
    lead: rotated
      ? { en: 'Your MCP token was reissued — the old one no longer works.', vi: 'Token MCP của bạn vừa được cấp lại — token cũ không còn dùng được.' }
      : { en: `Thanks for choosing AI Operations ${plan}. This MCP token lets an AI (Claude, Cursor, your own agent…) load knowledge into your assistant.`, vi: `Cảm ơn bạn đã chọn AI Operations ${plan}. Token MCP này cho AI (Claude, Cursor, agent của bạn…) nạp kiến thức cho trợ lý.` },
    claude: { en: 'Connect from Claude Code', vi: 'Kết nối từ Claude Code' },
    auto: { en: 'One-click install for Cursor, VS Code, Claude Desktop…', vi: 'Cài 1 chạm cho Cursor, VS Code, Claude Desktop…' },
    embed: { en: `Embed the assistant on your site (owner = ${owner})`, vi: `Nhúng trợ lý lên website (owner = ${owner})` },
    sector: {
      en: `division = the Consult of your sector — open now: ${codes}. Pick your sector and copy the matching code:`,
      vi: `division = phòng Tư vấn của lĩnh vực bạn chọn — đang mở: ${codes}. Chọn lĩnh vực và chép đúng đoạn mã:`,
    },
    workspace: { en: 'Secretary + departments workspace (Pro) — open your sector', vi: 'Không gian Thư ký + các phòng ban (Pro) — mở đúng lĩnh vực của bạn' },
    keep: { en: 'Keep this token like a password: whoever has it can load or delete your knowledge. Lost it? Assistant settings → Reissue token.', vi: 'Giữ token như mật khẩu: ai có nó đều nạp/xoá được kiến thức của bạn. Mất token thì vào Cài đặt trợ lý → Cấp lại token.' },
    guide: { en: 'Full guide', vi: 'Hướng dẫn đầy đủ' },
  };
  const both = (s: { en: string; vi: string }) => `${s.en}\n${s.vi}`;
  const text = [
    both(t.hello), '', both(t.lead), '',
    `MCP endpoint: ${mcpUrl}`,
    `MCP_TOKEN: ${token}`, '',
    `${both(t.claude)}:`, command, '',
    `${both(t.auto)}: ${docsUrl}#mcp`, '',
    `${both(t.embed)}:`, embed, '',
    both(t.sector), pickUrl, '',
    ...(departments ? [`${both(t.workspace)}:`, ...workspaces.map(w => `- ${w.name.en} / ${w.name.vi}: ${w.url}`), ''] : []),
    both(t.keep), '',
    `${both(t.guide)}: ${docsUrl}`,
  ].join('\n');
  const vi = (s: string) => `<br><span style="color:#777">${escapeHtml(s)}</span>`;
  const para = (s: { en: string; vi: string }) => `<p>${escapeHtml(s.en)}${vi(s.vi)}</p>`;
  const label = (s: { en: string; vi: string }) => `<p style="margin:18px 0 6px;font-size:13px;color:#555">${escapeHtml(s.en)} · ${escapeHtml(s.vi)}</p>`;
  const code = (s: string, extra = '') => `<code style="display:block;padding:10px 12px;background:#f3f3f5;border-radius:8px;word-break:break-all${extra}">${escapeHtml(s)}</code>`;
  const link = (href: string, s = href) => `<a href="${escapeHtml(href)}">${escapeHtml(s)}</a>`;
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.55;color:#111;max-width:560px">
      ${para(t.hello)}
      ${para(t.lead)}
      <p style="margin:18px 0 6px;font-size:13px;color:#555">MCP endpoint</p>${code(mcpUrl)}
      <p style="margin:18px 0 6px;font-size:13px;color:#555">MCP_TOKEN</p>${code(token, ';font-weight:600')}
      ${label(t.claude)}${code(command, ';font-size:12px')}
      <p style="margin:10px 0 0;font-size:13px">${escapeHtml(t.auto.en)} ${link(`${docsUrl}#mcp`, '→')}${vi(t.auto.vi)}</p>
      ${label(t.embed)}
      <pre style="margin:0;padding:10px 12px;background:#f3f3f5;border-radius:8px;white-space:pre-wrap;word-break:break-all;font-size:12px">${escapeHtml(embed)}</pre>
      <p style="margin:10px 0 0;font-size:13px">${escapeHtml(t.sector.en)} ${link(pickUrl, '→')}${vi(t.sector.vi)}</p>
      ${departments ? `${label(t.workspace)}${workspaces.map(w => `<p style="margin:0">${escapeHtml(w.name.en)} · ${escapeHtml(w.name.vi)}: ${link(w.url)}</p>`).join('')}` : ''}
      <p style="margin-top:18px;font-size:13px;color:#555">${escapeHtml(t.keep.en)}${vi(t.keep.vi)}</p>
      <p style="font-size:13px;color:#555">${escapeHtml(t.guide.en)} · ${escapeHtml(t.guide.vi)}: ${link(docsUrl)}</p>
    </div>`;
  const subject = rotated ? 'Your new MCP token · Token MCP mới của bạn' : 'Your AI Operations MCP token · Token MCP của bạn';
  return { to, subject, html, text };
}
