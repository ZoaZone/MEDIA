import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * sendEmailFallback — Sends transactional emails to ANY external address.
 *
 * Primary:  Resend (RESEND_API_KEY)
 *   From:   RESEND_FROM_EMAIL env var (default: noreply@media.aevoice.ai)
 *   Domain: media.aevoice.ai — verified & active in Resend ✅
 *
 * Fallback: SendGrid (SENDGRID_API_KEY)
 *   From:   SENDGRID_FROM_EMAIL env var (default: noreply@aevoice.ai)
 *
 * Set env vars:
 *   RESEND_API_KEY       — your Resend API key
 *   RESEND_FROM_EMAIL    — sender address (default: noreply@media.aevoice.ai)
 *   SENDGRID_API_KEY     — SendGrid key (fallback only)
 *   SENDGRID_FROM_EMAIL  — SendGrid from address (fallback only)
 */
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
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, {
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { to, subject, body, html, from_name } = await req.json();
    if (!to || !subject || !body) {
      return Response.json({ error: 'to, subject, and body are required' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const fromName = from_name || 'Agent Marketer';
    // media.aevoice.ai is verified in Resend — use as primary fallback domain
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@media.aevoice.ai';
    const htmlContent = html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${body}</pre>`;

    // ── PRIMARY: Resend (media.aevoice.ai — verified ✅) ─────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject,
          text: body,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return Response.json(
          { success: true, provider: 'resend', domain: 'media.aevoice.ai', id: data.id, to },
          { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const errText = await res.text();
      console.error(`Resend failed (${res.status}): ${errText} — falling back to SendGrid`);
    } else {
      console.warn('RESEND_API_KEY not set — falling back to SendGrid');
    }

    // ── FALLBACK: SendGrid ───────────────────────────────────────────────────
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridKey) {
      return Response.json(
        { error: 'No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY.' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const sgFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@aevoice.ai';
    const sgPayload: any = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: sgFromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: body },
        { type: 'text/html', value: htmlContent },
      ],
    };

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgPayload),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      throw new Error(`SendGrid error ${sgRes.status}: ${errText}`);
    }

    return Response.json(
      { success: true, provider: 'sendgrid', to },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error: any) {
    console.error('sendEmailFallback error:', error);
    return Response.json(
      { error: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
