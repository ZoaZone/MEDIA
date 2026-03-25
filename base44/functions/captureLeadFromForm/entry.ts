import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, funnel_id, form_data } = await req.json();
    if (!form_data) {
      return Response.json({ error: 'form_data is required' }, { status: 400 });
    }

    const data = typeof form_data === 'string' ? JSON.parse(form_data) : form_data;

    // Create LeadCapture record
    const lead = await base44.entities.LeadCapture.create({
      client_id: client_id || '',
      funnel_id: funnel_id || '',
      full_name: data.full_name || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      source: data.source || 'website',
      utm_source: data.utm_source || '',
      utm_campaign: data.utm_campaign || '',
      form_data: JSON.stringify(data),
      captured_at: new Date().toISOString(),
    });

    // Also create a MarketingContact
    await base44.entities.MarketingContact.create({
      client_id: client_id || '',
      full_name: data.full_name || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      source: data.source || 'website',
      funnel_stage: 'new',
      lead_score: 10,
      opted_in_email: true,
    });

    return Response.json({ success: true, lead_id: lead.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});