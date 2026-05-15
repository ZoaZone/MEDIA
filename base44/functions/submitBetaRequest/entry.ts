import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // CORS preflight
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
    const { full_name, email, company, use_case } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'full_name and email are required' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Check for duplicate email (service role — no auth needed for public form)
    const existing = await base44.asServiceRole.entities.BetaRequest.filter({ email });
    if (existing && existing.length > 0) {
      return Response.json({ success: true, message: 'Already registered' }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Create the record using service role (bypasses auth)
    const record = await base44.asServiceRole.entities.BetaRequest.create({
      full_name,
      email,
      company: company || '',
      use_case: use_case || '',
      status: 'pending',
      invite_sent: false,
    });

    // Notify admin via Base44 email integration
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'hellobizapp@gmail.com',
        subject: `🚀 New Beta Request from ${full_name}`,
        body: `A new beta access request has been submitted:\n\nName: ${full_name}\nEmail: ${email}\nCompany: ${company || '—'}\nUse Case: ${use_case || '—'}\n\nReview and approve in your Admin Dashboard → Beta Invites tab.`,
      });
    } catch (emailErr) {
      console.error('Admin email notification failed (non-fatal):', emailErr);
    }

    return Response.json({ success: true, id: record.id }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('submitBetaRequest error:', error);
    return Response.json({ error: error.message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
});
