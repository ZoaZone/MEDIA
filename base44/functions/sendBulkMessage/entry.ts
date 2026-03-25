import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id, client_id } = await req.json();
    if (!campaign_id) {
      return Response.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    // Get campaign
    const campaigns = await base44.entities.MarketingCampaign.filter({ id: campaign_id });
    if (campaigns.length === 0) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }
    const campaign = campaigns[0];

    // Get contacts
    const contacts = client_id
      ? await base44.entities.MarketingContact.filter({ client_id })
      : await base44.entities.MarketingContact.list('-created_date', 500);

    // Filter by opt-in based on campaign type
    const channelFilter = {
      email: (c) => c.opted_in_email && c.email,
      sms: (c) => c.opted_in_sms && c.phone,
      whatsapp: (c) => c.opted_in_whatsapp && (c.whatsapp || c.phone),
    };

    const filter = channelFilter[campaign.type] || channelFilter.email;
    const eligible = contacts.filter(filter);

    let sentCount = 0;

    // Create BulkMessage records for each contact
    for (const contact of eligible) {
      await base44.entities.BulkMessage.create({
        client_id: client_id || '',
        campaign_id,
        channel: campaign.type === 'multi_channel' ? 'email' : campaign.type,
        recipient_email: contact.email || '',
        recipient_phone: contact.phone || '',
        message_body: campaign.body || '',
        status: 'pending',
      });
      sentCount++;
    }

    // Update campaign stats
    await base44.entities.MarketingCampaign.update(campaign_id, {
      sent_count: (campaign.sent_count || 0) + sentCount,
      status: 'running',
    });

    return Response.json({ success: true, sent_count: sentCount, total_contacts: eligible.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});