import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://media.aevoice.ai';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildHtml(inviteUrl, inviteCode, note, firstName) {
  const greeting = firstName ? ('Hi ' + firstName + ',') : 'Hello,';
  const noteBlock = note
    ? '<div style="background:#f5f0ff;border-left:3px solid #a855f7;border-radius:8px;padding:14px 16px;margin-bottom:24px;">' +
      '<p style="color:#555;font-size:14px;margin:0;font-style:italic;">"' + note + '"</p>' +
      '<p style="color:#999;font-size:12px;margin:6px 0 0;">— The AEVOICE Team</p></div>'
    : '';

  const features = [
    'Full Agency-tier access — all features unlocked',
    'AI Media Studio — images, videos, scripts & copy',
    'Email, SMS, WhatsApp & Social campaigns',
    'Priority beta support & direct feedback channel',
  ];

  const featureRows = features.map(f =>
    '<tr><td style="padding:6px 0;"><table cellpadding="0" cellspacing="0"><tr>' +
    '<td style="width:24px;vertical-align:top;padding-top:1px;"><div style="width:18px;height:18px;background:#f0e6ff;border-radius:50%;text-align:center;line-height:18px;font-size:11px;">✓</div></td>' +
    '<td style="color:#444;font-size:14px;padding-left:8px;">' + f + '</td>' +
    '</tr></table></td></tr>'
  ).join('');

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<style>@media (prefers-color-scheme:dark){.email-body{background:#111 !important}.email-card{background:#1a1a2a !important;border-color:#2a2a3e !important}.email-text{color:#e0e0e0 !important}.email-sub{color:#aaa !important}.email-code-box{background:#0d0d1a !important;border-color:#3a2a5a !important}.email-code{color:#d8aaff !important}.email-footer{background:#0d0d14 !important;border-color:#2a2a3e !important}.email-footer-text{color:#666 !important}.email-link-box{background:#0a0a15 !important;border-color:#2a2a3a !important}.email-link{color:#a855f7 !important}}</style>' +
    '</head>' +
    '<body class="email-body" style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table class="email-card" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #e8e4f0;overflow:hidden;max-width:560px;width:100%;box-shadow:0 4px 24px rgba(120,60,200,0.08);">' +

    // Header gradient
    '<tr><td style="background:linear-gradient(135deg,#6d28d9 0%,#a855f7 55%,#ec4899 100%);padding:36px 40px;text-align:center;">' +
    '<div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:6px 16px;margin-bottom:12px;">' +
    '<span style="font-size:11px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.9);text-transform:uppercase;">AEVOICE</span>' +
    '</div>' +
    '<div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1.2;">media.aevoice.ai</div>' +
    '<div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:6px;font-weight:400;">AI Marketing & Media Creation Platform</div>' +
    '</td></tr>' +

    // Invite badge
    '<tr><td style="padding:0 40px;"><div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3);border:1px solid #e9d5ff;border-radius:12px;padding:12px 20px;text-align:center;margin:24px 0 0;">' +
    '<span style="font-size:13px;font-weight:700;color:#7c3aed;">🎉 You have a personal beta invitation</span>' +
    '</div></td></tr>' +

    // Body
    '<tr><td style="padding:28px 40px 8px;">' +
    '<p class="email-sub" style="color:#666;font-size:15px;margin:0 0 4px;">' + greeting + '</p>' +
    '<h1 class="email-text" style="color:#1a1a2a;font-size:24px;font-weight:800;margin:0 0 16px;line-height:1.3;">' +
    "You're invited to join<br/><span style='color:#7c3aed;'>media.aevoice.ai Beta</span></h1>" +
    '<p class="email-sub" style="color:#555;font-size:14px;line-height:1.8;margin:0 0 20px;">Our team has personally selected you for exclusive early access to ' +
    '<a href="' + APP_URL + '" style="color:#7c3aed;text-decoration:none;">media.aevoice.ai</a>' +
    ' — the AI-powered marketing platform for modern brands and agencies.</p>' +
    noteBlock +

    // Features
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">' + featureRows + '</table>' +

    // CTA Button
    '<div style="text-align:center;margin-bottom:28px;">' +
    '<a href="' + inviteUrl + '" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#a855f7);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:17px 48px;border-radius:14px;box-shadow:0 4px 16px rgba(168,85,247,0.35);">🚀 Claim My Free Access</a>' +
    '</div>' +

    '</td></tr>' +

    // Invite Code — prominent full-width section
    '<tr><td style="padding:0 40px 24px;">' +
    '<div class="email-code-box" style="background:#faf5ff;border:2px solid #d8b4fe;border-radius:16px;padding:22px 24px;text-align:center;">' +
    '<p style="color:#7c3aed;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Your Sign-Up Invite Code</p>' +
    '<div class="email-code" style="color:#6d28d9;font-size:38px;font-weight:900;letter-spacing:10px;font-family:\'Courier New\',Courier,monospace;line-height:1;margin:0 0 10px;">' + inviteCode + '</div>' +
    '<p style="color:#9333ea;font-size:12px;margin:0;">Enter this code when prompted during sign-up</p>' +
    '</div>' +
    '</td></tr>' +

    // Invite link fallback
    '<tr><td style="padding:0 40px 24px;">' +
    '<div class="email-link-box" style="background:#fafafa;border:1px solid #ede9f4;border-radius:10px;padding:14px 16px;">' +
    '<p style="color:#999;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;font-weight:600;">Your Personal Invite Link</p>' +
    '<a class="email-link" href="' + inviteUrl + '" style="color:#7c3aed;font-size:12px;word-break:break-all;text-decoration:none;">' + inviteUrl + '</a>' +
    '</div>' +
    '</td></tr>' +

    // Expiry note
    '<tr><td style="padding:0 40px 28px;">' +
    '<p class="email-sub" style="color:#888;font-size:12px;margin:0;text-align:center;">⏰ This invite expires in <strong>30 days</strong>. Questions? Reply to this email.</p>' +
    '</td></tr>' +

    // Footer
    '<tr><td class="email-footer" style="background:#f8f5ff;padding:18px 40px;border-top:1px solid #ede9f4;text-align:center;">' +
    '<p class="email-footer-text" style="color:#aaa;font-size:11px;margin:0;">' +
    '© 2026 AEVOICE · <a href="' + APP_URL + '" style="color:#a855f7;text-decoration:none;">media.aevoice.ai</a> · ' +
    '<a href="mailto:hello@aevoice.ai" style="color:#a855f7;text-decoration:none;">hello@aevoice.ai</a>' +
    '</p></td></tr>' +

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
    const { email, note = '', source = 'manual_invite', full_name = '' } = body;

    if (!email) {
      return Response.json({ error: 'email is required' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 1. Generate token + 6-char invite code
    const token = generateToken();
    const inviteCode = token.slice(0, 6).toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const inviteUrl = APP_URL + '/invite/' + token;

    // 2. Upsert BetaRequest record
    const existing = await base44.asServiceRole.entities.BetaRequest.filter({ email });
    let invite;
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.BetaRequest.update(existing[0].id, {
        invite_token: token,
        invite_expires_at: expiresAt,
        status: 'approved',
        invite_sent: true,
        note: note || existing[0].note || '',
      });
      invite = { ...existing[0], invite_token: token, invite_expires_at: expiresAt };
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

    // 3. Also invite via Base44 (so they can set a password through Base44 auth)
    try {
      await base44.asServiceRole.users?.inviteUser?.(email, 'user');
    } catch (e) {
      console.warn('Base44 inviteUser skipped:', e.message);
    }

    // 4. Build email content
    const firstName = full_name ? full_name.split(' ')[0] : '';
    const htmlBody = buildHtml(inviteUrl, inviteCode, note, firstName);
    const plainText = [
      'Hi' + (firstName ? ' ' + firstName : '') + ',',
      '',
      "You've been approved for AEVOICE Beta Access!",
      '',
      'Claim your free Agency-tier access here:',
      inviteUrl,
      '',
      'Your Invite Code: ' + inviteCode,
      '(Enter this code if prompted during sign-up)',
      '',
      'This invite expires in 30 days.',
      '',
      '— The AEVOICE Team',
      'media.aevoice.ai',
    ].join('\n');

    const subject = "🎉 You're in — Claim your free AEVOICE Beta access";

    // Send via SendGrid
    const sgKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sgKey) throw new Error('SENDGRID_API_KEY is not set.');
    const sgFrom = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@aevoice.ai';
    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sgKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: sgFrom, name: 'AEVOICE' },
        subject,
        content: [{ type: 'text/plain', value: plainText }, { type: 'text/html', value: htmlBody }],
      }),
    });
    if (!sgRes.ok) {
      const errBody = await sgRes.text();
      console.error('SendGrid failed:', errBody);
      throw new Error('SendGrid failed: ' + errBody);
    }
    const provider = 'sendgrid';
    console.log('Email sent via SendGrid to:', email);

    return Response.json(
      { success: true, email, invite_id: invite.id, invite_url: inviteUrl, invite_code: inviteCode, provider },
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