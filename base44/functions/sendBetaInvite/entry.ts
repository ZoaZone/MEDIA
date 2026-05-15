import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://media.aevoice.ai';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildHtml(inviteUrl, note, firstName) {
  const greeting = firstName ? ('Hi ' + firstName + ", you're") : "You're";
  const noteBlock = note
    ? '<div style="background:#1a1a2e;border-left:3px solid #a855f7;border-radius:8px;padding:14px 16px;margin-bottom:20px;"><p style="color:#ccc;font-size:14px;margin:0;font-style:italic;">"' + note + '"</p><p style="color:#666;font-size:12px;margin:6px 0 0;">— The media.aevoice.ai Team</p></div>'
    : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"/></head>' +
    '<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">' +
    '<tr><td align="center">' +
    '<table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:24px;border:1px solid #1f1f2e;overflow:hidden;max-width:560px;width:100%;">' +
    '<tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);padding:36px 40px;text-align:center;">' +
    '<div style="font-size:28px;font-weight:900;color:#fff;">media.aevoice.ai</div>' +
    '<div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">AI Marketing & Media Creation Platform</div>' +
    '</td></tr>' +
    '<tr><td style="padding:40px;">' +
    '<h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 16px;">' +
    greeting + ' invited to join<br/><span style="color:#a855f7;">media.aevoice.ai Beta</span></h1>' +
    '<p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px;">You have been personally selected for exclusive early access — full Agency-tier access, free for 1 year.</p>' +
    noteBlock +
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">' +
    '<tr><td style="padding:4px 0;color:#ccc;font-size:14px;">Full Agency-tier access — free for 1 year</td></tr>' +
    '<tr><td style="padding:4px 0;color:#ccc;font-size:14px;">AI Media Studio — visuals, copy, video scripts</td></tr>' +
    '<tr><td style="padding:4px 0;color:#ccc;font-size:14px;">Multi-channel: Email, SMS, WhatsApp, Social</td></tr>' +
    '</table>' +
    '<div style="text-align:center;margin-bottom:28px;">' +
    '<a href="' + inviteUrl + '" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:14px;">Claim My Free Access</a>' +
    '</div>' +
    '<div style="background:#0a0a0a;border:1px solid #1f1f2e;border-radius:10px;padding:14px 16px;margin-bottom:16px;">' +
    '<p style="color:#666;font-size:11px;margin:0 0 6px;text-transform:uppercase;">Your invite link</p>' +
    '<p style="color:#a855f7;font-size:13px;margin:0;word-break:break-all;">' + inviteUrl + '</p>' +
    '</div>' +
    '<p style="color:#555;font-size:13px;margin:0;">Expires in 30 days</p>' +
    '</td></tr>' +
    '<tr><td style="background:#0d0d14;padding:20px 40px;border-top:1px solid #1f1f2e;text-align:center;">' +
    '<p style="color:#444;font-size:12px;margin:0;">2026 AEVOICE - media.aevoice.ai</p>' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

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
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { email, note = '', invited_by = 'admin', source = 'manual_invite', full_name = '' } = body;

    if (!email) {
      return Response.json({ error: 'email is required' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 1. Store invite token in BetaRequest record (reuse existing entity)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const existing = await base44.asServiceRole.entities.BetaRequest.filter({ email });
    let invite;
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.BetaRequest.update(existing[0].id, {
        invite_token: token,
        invite_expires_at: expiresAt,
        status: 'approved',
        invite_sent: true,
      });
      invite = existing[0];
    } else {
      invite = await base44.asServiceRole.entities.BetaRequest.create({
        email,
        full_name: full_name || '',
        status: 'approved',
        note,
        invite_token: token,
        invite_expires_at: expiresAt,
        invite_sent: true,
      });
    }

    // 2. Send invite email via SendGrid
    const inviteUrl = APP_URL + '/invite/' + token;
    const firstName = full_name ? full_name.split(' ')[0] : '';
    const htmlBody = buildHtml(inviteUrl, note, firstName);
    const plainText = 'Hi' + (firstName ? ' ' + firstName : '') + '!\n\nYou have been invited to media.aevoice.ai Beta.\n\nClaim your access: ' + inviteUrl + '\n\nExpires in 30 days.\n\n— The media.aevoice.ai Team';

    const resendKey = Deno.env.get('RESEND_API_KEY');
    let provider = 'none';

    if (resendKey) {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@media.aevoice.ai';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'media.aevoice.ai <' + fromEmail + '>',
          to: [email],
          subject: "You're personally invited — Free Beta Access to media.aevoice.ai",
          text: plainText,
          html: htmlBody,
        }),
      });
      if (res.ok) {
        provider = 'resend';
      } else {
        console.error('Resend failed:', await res.text());
      }
    }

    if (provider === 'none') {
      const sgKey = Deno.env.get('SENDGRID_API_KEY');
      if (sgKey) {
        const sgFrom = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@aevoice.ai';
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + sgKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: sgFrom, name: 'media.aevoice.ai' },
            subject: "You're personally invited — Free Beta Access to media.aevoice.ai",
            content: [{ type: 'text/plain', value: plainText }, { type: 'text/html', value: htmlBody }],
          }),
        });
        if (sgRes.ok) {
          provider = 'sendgrid';
        } else {
          throw new Error('SendGrid failed: ' + await sgRes.text());
        }
      } else {
        throw new Error('No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY.');
      }
    }

    return Response.json(
      { success: true, email, invite_id: invite.id, invite_url: inviteUrl, provider },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('sendBetaInvite error:', error);
    return Response.json(
      { error: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});