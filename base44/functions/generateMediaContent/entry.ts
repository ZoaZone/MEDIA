import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, platform, prompt, client_id, website_scan_id } = await req.json();
    if (!type || !prompt) {
      return Response.json({ error: 'type and prompt are required' }, { status: 400 });
    }

    let context = '';
    if (website_scan_id) {
      try {
        const scans = await base44.entities.WebsiteScan.filter({ id: website_scan_id });
        if (scans.length > 0) {
          const scan = scans[0];
          context = `\n\nBusiness context from website scan:\n- Summary: ${scan.business_summary}\n- Services: ${(scan.services_found || []).join(', ')}\n- Keywords: ${(scan.keywords_found || []).join(', ')}\n- Tone: ${scan.tone}`;
        }
      } catch (_) { /* scan not found, continue */ }
    }

    const prompts = {
      caption: `Create an engaging ${platform || 'social media'} caption. Topic: ${prompt}. Include relevant emojis. Make it attention-grabbing and platform-optimized.${context}`,
      ad_copy: `Write compelling ad copy for ${platform || 'digital advertising'}. Product/Service: ${prompt}. Include headline, body, and CTA.${context}`,
      email_template: `Write a professional marketing email template. Topic: ${prompt}. Include subject line and body with clear CTA.${context}`,
      sms_template: `Write a concise SMS marketing message (under 160 chars). Topic: ${prompt}. Include a clear CTA.${context}`,
      hashtag_set: `Generate 20-30 relevant hashtags for ${platform || 'social media'} about: ${prompt}. Return as a list.${context}`,
      script: `Write a video script for ${platform || 'social media'}. Topic: ${prompt}. Include scene directions and dialogue.${context}`,
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompts[type] || prompts.caption,
    });

    // Save to ContentAsset
    const asset = await base44.entities.ContentAsset.create({
      client_id: client_id || '',
      type,
      title: `${type} - ${prompt.slice(0, 50)}`,
      content: result,
      platform: platform || '',
      ai_generated: true,
      prompt_used: prompt,
      status: 'ready',
    });

    return Response.json({ success: true, asset_id: asset.id, content: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});