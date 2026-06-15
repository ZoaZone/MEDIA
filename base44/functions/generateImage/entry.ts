import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Free-trial allowance: ~5 images or 3 short (4-scene) videos before a
// subscription or purchased credits are required.
const FREE_TRIAL_GENERATION_LIMIT = 25;
const PAID_TIERS = ['starter', 'growth', 'agency'];
const ACTIVE_STATUSES = ['active', 'trialing'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

    const { prompt, platform, dimensions, client_id, reference_image_urls } = await req.json();
    if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400, headers: CORS });

    // Free-trial gating: users without an active paid subscription get a
    // limited number of AI generations before being asked to subscribe or
    // purchase credits.
    let creditToConsume: { id: string; balance: number } | null = null;
    if (user.role !== 'admin') {
      let subs: any[] = [];
      try {
        subs = await base44.asServiceRole.entities.Subscription.filter({ owner_email: user.email });
      } catch (_) {}

      const sub = subs?.[0];
      const hasPaidPlan = !!sub && ACTIVE_STATUSES.includes(sub.status) && PAID_TIERS.includes(sub.plan_tier);

      if (!hasPaidPlan) {
        let usedCount = 0;
        try {
          const items = await base44.asServiceRole.entities.MediaLibraryItem.filter({ created_by: user.email, ai_generated: true });
          usedCount = items?.length || 0;
        } catch (_) {}

        if (usedCount >= FREE_TRIAL_GENERATION_LIMIT) {
          const creditsBalance = sub?.credits_balance || 0;
          if (creditsBalance > 0 && sub?.id) {
            creditToConsume = { id: sub.id, balance: creditsBalance };
          } else {
            return Response.json({
              error: 'trial_limit_reached',
              message: `You've used all ${FREE_TRIAL_GENERATION_LIMIT} free AI generations. Subscribe to a plan or purchase credits to keep creating.`,
              used: usedCount,
              limit: FREE_TRIAL_GENERATION_LIMIT,
            }, { status: 403, headers: CORS });
          }
        }
      }
    }

    const refInstruction = reference_image_urls?.length
      ? ' IMPORTANT: Replicate the exact person(s), face(s), outfit, and visual style from the provided reference images as faithfully as possible. Maintain their likeness while adapting composition to match the marketing context.'
      : '';
      
    // Added strict instructions to prevent text and fake logo hallucination
    const noTextInstruction = ' STRICTLY NO TEXT: Do not generate any text, letters, words, typography, watermarks, or logos anywhere in the image. Keep the image completely free of written content.';

    const enhancedPrompt = `${prompt}${refInstruction}${platform ? ` Optimized for ${platform}.` : ''}${dimensions ? ` Aspect ratio: ${dimensions}.` : ''} High quality, professional, sharp, commercial photography style.${noTextInstruction}`;

    const result = await base44.integrations.Core.GenerateImage({
      prompt: enhancedPrompt,
      existing_image_urls: reference_image_urls?.length ? reference_image_urls : undefined,
    });
    const url = result?.url || result?.file_url;
    if (!url) throw new Error('No image URL returned');

    let item;
    try {
      item = await base44.entities.MediaLibraryItem.create({
          client_id: client_id || '',
          title: prompt.slice(0, 60),
          file_url: url,
          file_type: 'image',
          dimensions: dimensions || '',
          ai_generated: true
      });
    } catch (_) {}

    // Past the free-trial allowance and paying with purchased credits — deduct one.
    if (creditToConsume) {
      try {
        await base44.asServiceRole.entities.Subscription.update(creditToConsume.id, {
          credits_balance: creditToConsume.balance - 1,
        });
      } catch (_) {}
    }

    return Response.json({ success: true, file_url: url, url, item_id: item?.id }, { headers: CORS });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
});