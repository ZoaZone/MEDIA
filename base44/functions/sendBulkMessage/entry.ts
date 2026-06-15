import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Platform-managed email sending — used when the user hasn't configured
 * their own SendGrid key. Chain: Base44 built-in -> Resend -> SendGrid
 * (admin keys). Mirrors sendEmailFallback's provider order. Billed at the
 * platform's "managed sending" rate (provider cost + 30% usage margin) once
 * the account's plan-included quota is used up.
 */
async function sendPlatformEmail(base44: any, { to, subject, html, text }: any): Promise<{ ok: boolean; error?: string }> {
  const fromName = 'digitalstudios.app';
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@digitalstudios.app';
  const plainText = text || '';
  const htmlContent = html || '<pre style="font-family:sans-serif;white-space:pre-wrap">' + plainText + '</pre>';

  // PRIMARY: Base44 built-in
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: plainText });
    return { ok: true };
  } catch (_e) { /* try next provider */ }

  // SECONDARY: Resend
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, text: plainText, html: htmlContent }),
    });
    if (res.ok) return { ok: true };
  }

  // TERTIARY: SendGrid (platform/admin key)
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
  if (sendgridKey) {
    const sgFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@aevoice.ai';
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sendgridKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: sgFromEmail, name: fromName },
        subject,
        content: [{ type: 'text/plain', value: plainText }, { type: 'text/html', value: htmlContent }],
      }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: await res.text() };
  }

  return { ok: false, error: 'No platform email provider configured (Base44 / Resend / SendGrid).' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id, client_id } = await req.json();
    if (!campaign_id) return Response.json({ error: 'campaign_id is required' }, { status: 400 });

    const campaigns = await base44.entities.MarketingCampaign.filter({ id: campaign_id, created_by: user.email });
    if (!campaigns.length) return Response.json({ error: 'Campaign not found' }, { status: 404 });
    const campaign = campaigns[0];

    const contacts = client_id
      ? await base44.entities.MarketingContact.filter({ client_id, created_by: user.email })
      : await base44.entities.MarketingContact.filter({ created_by: user.email }, '-created_date', 500);

    const channelFilter = {
      email:     (c) => c.opted_in_email && c.email,
      sms:       (c) => c.opted_in_sms && c.phone,
      whatsapp:  (c) => c.opted_in_whatsapp && (c.whatsapp || c.phone),
    };
    const filter = channelFilter[campaign.type] || channelFilter.email;
    const eligible = contacts.filter(filter);

    // Retrieve "bring your own" keys from user settings — when present, the
    // user's own credentials/billing are used (no platform margin). When
    // absent, sends fall back to the platform's managed providers below
    // (admin env vars), billed per the cost+30% managed-sending rates.
    const userSettings = (user as any).settings || {};
    const apiKeys = userSettings.api_keys || {};
    const sendgridKey = apiKeys.sendgrid_key || '';
    const twilioSid   = apiKeys.twilio_sid   || Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioToken = apiKeys.twilio_token || Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioPhone = apiKeys.twilio_phone || Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    const waToken     = apiKeys.whatsapp_token   || Deno.env.get('WHATSAPP_TOKEN') || '';
    const waPhoneId   = apiKeys.whatsapp_phone_id || Deno.env.get('WHATSAPP_PHONE_ID') || '';

    const smsIsByo = !!(apiKeys.twilio_sid && apiKeys.twilio_token);
    const waIsByo  = !!(apiKeys.whatsapp_token && apiKeys.whatsapp_phone_id);

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of eligible) {
      let status = 'pending';
      let errorMsg = '';
      let sentVia: 'byo' | 'platform' = 'platform';

      try {
        if (campaign.type === 'email') {
          if (sendgridKey) {
            // Bring-your-own SendGrid — sent on the user's own account/billing
            const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: contact.email, name: contact.full_name || '' }] }],
                from: { email: 'noreply@agentmarketer.ai', name: 'Agent Marketer' },
                subject: campaign.subject || campaign.name,
                content: [{ type: 'text/html', value: campaign.body || campaign.subject || '' }],
              }),
            });
            status = sgRes.ok ? 'delivered' : 'failed';
            if (!sgRes.ok) errorMsg = await sgRes.text();
            sentVia = 'byo';
          } else {
            // Platform-managed sending (Base44 -> Resend -> SendGrid)
            const result = await sendPlatformEmail(base44, {
              to: contact.email,
              subject: campaign.subject || campaign.name,
              text: campaign.body || campaign.subject || '',
            });
            status = result.ok ? 'delivered' : 'pending';
            if (!result.ok) errorMsg = result.error || 'Platform email sending unavailable. Add your own SendGrid key in Settings.';
            sentVia = 'platform';
          }

        } else if (campaign.type === 'sms' && twilioSid && twilioToken) {
          // Twilio SMS — user's own account if configured, else platform Twilio
          const formData = new URLSearchParams({
            To: contact.phone,
            From: twilioPhone,
            Body: campaign.body || '',
          });
          const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: { Authorization: `Basic ${btoa(twilioSid + ':' + twilioToken)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
          });
          status = twRes.ok ? 'delivered' : 'failed';
          if (!twRes.ok) errorMsg = await twRes.text();
          sentVia = smsIsByo ? 'byo' : 'platform';

        } else if (campaign.type === 'whatsapp' && waToken && waPhoneId) {
          // WhatsApp Cloud API — user's own BSP token if configured, else platform
          const phone = (contact.whatsapp || contact.phone || '').replace(/\D/g, '');
          const waRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: campaign.body || '' },
            }),
          });
          status = waRes.ok ? 'delivered' : 'failed';
          if (!waRes.ok) errorMsg = await waRes.text();
          sentVia = waIsByo ? 'byo' : 'platform';

        } else {
          // No API keys configured for SMS/WhatsApp — queue for later
          status = 'pending';
          errorMsg = 'No API keys configured. Add keys in Settings.';
        }
      } catch (err) {
        status = 'failed';
        errorMsg = (err as Error).message;
        failedCount++;
      }

      await base44.entities.BulkMessage.create({
        client_id: client_id || '',
        campaign_id,
        channel: campaign.type,
        recipient_email: contact.email || '',
        recipient_phone: contact.phone || '',
        message_body: campaign.body || '',
        status,
        sent_via: sentVia,
        sent_at: new Date().toISOString(),
        error_message: errorMsg,
      });

      if (status === 'delivered' || status === 'pending') sentCount++;
    }

    await base44.entities.MarketingCampaign.update(campaign_id, {
      sent_count: (campaign.sent_count || 0) + sentCount,
      status: 'running',
    });

    return Response.json({ success: true, sent_count: sentCount, failed_count: failedCount, total_eligible: eligible.length });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
