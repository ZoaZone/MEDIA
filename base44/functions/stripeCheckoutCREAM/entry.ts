import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, client_id } = await req.json();
    if (!plan) {
      return Response.json({ error: 'plan is required' }, { status: 400 });
    }

    const plans = {
      starter: { name: 'Starter', price: 4900, tier: 'starter' },
      growth: { name: 'Growth', price: 14900, tier: 'growth' },
      agency: { name: 'Agency', price: 39900, tier: 'agency' },
    };

    const selectedPlan = plans[plan];
    if (!selectedPlan) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Note: In production, this would create a Stripe checkout session
    // using the STRIPE_API_KEY secret. For now, create subscription record.
    const subscription = await base44.entities.Subscription.create({
      owner_email: user.email,
      client_id: client_id || '',
      plan_name: selectedPlan.name,
      plan_tier: selectedPlan.tier,
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return Response.json({
      success: true,
      subscription_id: subscription.id,
      message: `Subscribed to ${selectedPlan.name} plan`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});