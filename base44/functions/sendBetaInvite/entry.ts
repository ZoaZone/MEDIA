import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://media.aevoice.ai';

const buildInviteHtml = (inviteUrl: string, note: string, firstName: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:24px;border:1px solid #1f1f2e;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">media.aevoice.ai</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">AI Marketing & Media Creation Platform</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="background:#7c3aed22;border:1px solid #7c3aed44;border-radius:12px;padding:12px 16px;margin-bottom:28px;text-align:center;">
            <span style="color:#a855f7;font-size:13px;font-weight:600;">🎉 You have a personal beta invitation</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 12px;line-height:1.3;">
            ${firstName ? `Hi ${firstName}, you're invited` : "You're invited"} to join<br/>
            <span style="background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">media.aevoice.ai Beta</span>
          </h1>
          <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px;">Our team has personally selected you for exclusive early access to media.aevoice.ai — the AI-powered marketing platform for modern brands and agencies.</p>
          ${note ? `<div style="background:#1a1a2e;border-left:3px solid #a855f7;border-radius:8px;padding:14px 16px;margin-bottom:24px;"><p style="color:#ccc;font-size:14px;margin:0;font-style:italic;">"${note}"</p><p style="color:#666;font-size:12px;margin:6px 0 0;">— The media.aevoice.ai Team</p></div>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; Full <strong>Agency-tier</strong> access — free for 1 year</td></tr>
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; AI Media Studio — visuals, copy, video scripts</td></tr>
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; Multi-channel: Email · SMS · WhatsApp · Social</td></tr>
            <tr><td style="padding:4px 0;color:#ccc;font-size:14px;">✅&nbsp; Priority support &amp; direct feedback channel</td></tr>
          </table>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:14px;letter-spacing:0.3px;">
              🚀 Claim My Free Access
            </a>
          </div>
          <div style="background:#0a0a0a;border:1px solid #1f1f2e;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
            <p style="color:#666;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;">Your personal invite link</p>
            <p style="color:#a855f7;font-size:13px;margin:0;word-break:break-all;">${inviteUrl}</p>
          </div>
          <p style="color:#555;font-size:13px;margin:0;line-height:1.5;">This link is exclusive to you and expires in <strong style="color:#888;">30 days</strong>. Questions? <a href="mailto:hello@aevoice.ai" style="color:#a855f7;">hello@aevoice.ai</a></p>
        </td></tr>
        <tr><td style="background:#0d0d14;padding:20px 40px;border-top:1px solid #1f1f2e;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">© 2026 AEVOICE · <a href="https://media.aevoice.ai" style="color:#666;text-decoration:none;">media.aevoice.ai</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Use service role throughout — no auth.me() check needed.
    // Admin-only access is enforced on the frontend (AdminDashboard role guard).
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { email, note = '', invited_by = '', source = 'manual_invite', full_name = '' } = body;

    if (!email) {
      return Response.json({ error: 'email is required' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Generate unique token — 30-day expiry
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create BetaInvite record via service role
    const invite = await base44.asServiceRole.entities.BetaInvite.create({
      email,
      token,
      invited_by: invited_by || 'admin',
      note,
      status: 'pending',
      expires_at: expiresAt,
      source,
    });

    const inviteUrl = `${APP_URL}/invite/${token}`;
    const firstName = full_name ? full_name.split(' ')[0] : '';
    const htmlBody = buildInviteHtml(inviteUrl, note, firstName);
    const plainText = `Hi${firstName ? ` ${firstName}` : ''}!\n\nYou've been personally invited to media.aevoice.ai Beta — full Agency-tier access, completely free.\n\n${note ? `Personal note: "${note}"\n\n` : ''}👉 Claim your access here:\n${inviteUrl}\n\nThis link is exclusive to you and expires in 30 days.\n\nQuestions? hello@aevoice.ai\n\n— The media.aevoice.ai Team`;

    // ── PRIMARY: Resend ──────────────────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let emailProvider = 'none';

    if (resendKey) {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@media.aevoice.ai';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `media.aevoice.ai <${fromEmail}>`,
          to: [email],
          subject: `🎉 You're personally invited — Free Beta Access to media.aevoice.ai`,
          text: plainText,
          html: htmlBody,
        }),
      });
      if (res.ok) {
        emailProvider = 'resend';
      } else {
        const errText = await res.text();
        console.error(`Resend failed: ${errText}`);
      }
    }

    // ── FALLBACK: SendGrid ───────────────────────────────────────────────────
    if (emailProvider === 'none') {
      const sgKey = Deno.env.get('SENDGRID_API_KEY');
      if (sgKey) {
        const sgFrom = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@aevoice.ai';
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: sgFrom, name: 'media.aevoice.ai' },
            subject: `🎉 You're personally invited — Free Beta Access to media.aevoice.ai`,
            content: [
              { type: 'text/plain', value: plainText },
              { type: 'text/html', value: htmlBody },
            ],
          }),
        });
        if (sgRes.ok) {
          emailProvider = 'sendgrid';
        } else {
          const err = await sgRes.text();
          throw new Error(`SendGrid failed: ${err}`);
        }
      } else {
        throw new Error('No email provider configured (set RESEND_API_KEY)');
      }
    }

    return Response.json(
      { success: true, email, invite_id: invite.id, invite_url: inviteUrl, email_provider: emailProvider },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error: any) {
    console.error('sendBetaInvite error:', error);
    return Response.json(
      { error: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
