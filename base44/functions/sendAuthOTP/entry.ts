import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * sendAuthOTP
 * Generates a 6-digit OTP, stores it with expiry in a temp record,
 * sends it via email (Resend → SendGrid → Base44 fallback).
 * Also handles OTP verification.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildEmailHtml(otp, purpose) {
  const title = purpose === 'signup' ? 'Verify your email' : purpose === 'reset' ? 'Reset your password' : 'Your sign-in code';
  const body = purpose === 'signup'
    ? 'Use the code below to verify your email and complete your DigitalStudios registration.'
    : purpose === 'reset'
    ? 'Use the code below to reset your password. If you didn\'t request this, ignore this email.'
    : 'Use the code below to sign in to your DigitalStudios account.';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background:#0a0a0a;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:20px;border:1px solid #1f1f2e;overflow:hidden;max-width:480px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);padding:28px 36px;text-align:center;">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">DigitalStudios</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:3px;">AI Marketing & Media Platform · digitalstudios.app</div>
  </td></tr>
  <tr><td style="padding:36px;">
    <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 10px;">${title}</h2>
    <p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 28px;">${body}</p>
    <div style="background:#0a0a0a;border:1px solid #2a2a3e;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:42px;font-weight:900;color:#a855f7;letter-spacing:10px;font-family:monospace;">${otp}</div>
      <p style="color:#555;font-size:11px;margin:12px 0 0;">Valid for 10 minutes</p>
    </div>
    <p style="color:#444;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
  </td></tr>
  <tr><td style="background:#0d0d14;padding:16px 36px;border-top:1px solid #1f1f2e;text-align:center;">
    <p style="color:#444;font-size:11px;margin:0;">© 2026 DigitalStudios · <a href="https://digitalstudios.app" style="color:#555;text-decoration:none;">digitalstudios.app</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
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

  const headers = { 'Access-Control-Allow-Origin': '*' };

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const { action, email, otp: submittedOTP, purpose = 'login' } = payload;

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400, headers });
    }

    // ── SEND OTP ──────────────────────────────────────────────────────────────
    if (action === 'send') {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      // Store OTP in BetaRequest entity temporarily (reuse as scratch pad)
      // We use a dedicated OTP record keyed by email+purpose
      const existing = await base44.asServiceRole.entities.BetaRequest.filter({ email });
      const otpData = { invite_token: `OTP:${otp}`, invite_expires_at: expiresAt, note: `otp_purpose:${purpose}` };

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.BetaRequest.update(existing[0].id, otpData);
      } else {
        await base44.asServiceRole.entities.BetaRequest.create({
          email,
          full_name: email.split('@')[0],
          status: 'pending',
          ...otpData,
        });
      }

      // Send email
      const subjects = { login: 'Your DigitalStudios sign-in code', signup: 'Verify your DigitalStudios email', reset: 'Reset your DigitalStudios password' };
      const subject = subjects[purpose] || 'Your DigitalStudios verification code';
      const html = buildEmailHtml(otp, purpose);
      const text = `Your ${purpose === 'reset' ? 'password reset' : 'verification'} code for DigitalStudios is: ${otp}\n\nValid for 10 minutes.\n\n— The DigitalStudios Team\nhttps://digitalstudios.app`;

      let provider = 'none';
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        const fromEmail = (Deno.env.get('RESEND_FROM_EMAIL') || 'hello@digitalstudios.app').trim();
        const fromField = fromEmail.includes('<') ? fromEmail : `digitalstudios.app <${fromEmail}>`;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromField, to: [email], subject, text, html }),
        });
        if (res.ok) provider = 'resend';
      }

      if (provider === 'none') {
        const sgKey = Deno.env.get('SENDGRID_API_KEY');
        if (sgKey) {
          const sgFrom = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@aevoice.ai';
          const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }] }],
              from: { email: sgFrom, name: 'digitalstudios.app' },
              subject,
              content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
            }),
          });
          if (sgRes.ok) provider = 'sendgrid';
        }
      }

      if (provider === 'none') {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body: text });
          provider = 'base44';
        } catch (e) {
          console.warn('Base44 email failed:', e.message);
        }
      }

      return Response.json({ success: true, provider }, { headers });
    }

    // ── VERIFY OTP ────────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!submittedOTP) {
        return Response.json({ error: 'otp is required' }, { status: 400, headers });
      }

      const records = await base44.asServiceRole.entities.BetaRequest.filter({ email });
      if (!records || records.length === 0) {
        return Response.json({ error: 'No OTP found for this email. Please request a new code.' }, { status: 400, headers });
      }

      const record = records[0];
      const storedToken = record.invite_token || '';
      if (!storedToken.startsWith('OTP:')) {
        return Response.json({ error: 'No active OTP found. Please request a new code.' }, { status: 400, headers });
      }

      const storedOTP = storedToken.replace('OTP:', '');
      const expiresAt = record.invite_expires_at ? new Date(record.invite_expires_at) : null;

      if (expiresAt && Date.now() > expiresAt.getTime()) {
        return Response.json({ error: 'Code has expired. Please request a new one.' }, { status: 400, headers });
      }

      if (storedOTP !== submittedOTP.trim()) {
        return Response.json({ error: 'Incorrect code. Please try again.' }, { status: 400, headers });
      }

      // Clear OTP after successful verification
      await base44.asServiceRole.entities.BetaRequest.update(record.id, {
        invite_token: '',
        note: `verified:${purpose}`,
        status: 'approved',
        invite_sent: true,
      });

      return Response.json({ success: true, verified: true }, { headers });
    }

    return Response.json({ error: 'Invalid action. Use "send" or "verify".' }, { status: 400, headers });

  } catch (error) {
    console.error('sendAuthOTP error:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
});