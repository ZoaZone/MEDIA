import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_API_KEY") || "";
const PAYPAL_SECRET    = Deno.env.get("PAYPAL_API_SECRET") || "";
const PAYPAL_ENV       = Deno.env.get("PAYPAL_ENV") || "live";
const PAYPAL_BASE      = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const creds = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const respond = (data, status = 200) =>
    Response.json(data, { status, headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, amount, currency = "INR", plan_name = "", customer_email = "", order_id } = body;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return respond({ error: "PayPal credentials not configured. Please set PAYPAL_API_KEY and PAYPAL_API_SECRET." }, 500);
    }

    if (action === "create_order") {
      if (!amount) return respond({ error: "amount is required" }, 400);

      const token = await getAccessToken();
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: currency, value: Number(amount).toFixed(2) },
            description: plan_name ? `digitalstudios.app — ${plan_name} Plan` : "digitalstudios.app Payment",
          }],
          application_context: {
            brand_name: "digitalstudios.app",
            locale: "en-IN",
            landing_page: "BILLING",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: "https://digitalstudios.app/onboarding",
            cancel_url: "https://digitalstudios.app/pricing",
          },
          ...(customer_email ? { payer: { email_address: customer_email } } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) return respond({ error: data.message || "PayPal order creation failed", details: data }, 500);

      const approve_url = data.links?.find((l) => l.rel === "approve")?.href;
      return respond({ success: true, order_id: data.id, approve_url });
    }

    if (action === "capture_order") {
      if (!order_id) return respond({ error: "order_id is required" }, 400);

      const token = await getAccessToken();
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: "{}",
      });

      const data = await res.json();
      if (!res.ok) return respond({ error: data.message || "Capture failed", details: data }, 500);

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
      return respond({ success: true, order_id: data.id, status: data.status, capture_id: capture?.id, amount: capture?.amount });
    }

    return respond({ error: "Invalid action. Use create_order or capture_order." }, 400);
  } catch (err) {
    console.error("paypalCheckout error:", err);
    return respond({ error: err.message || "Internal error" }, 500);
  }
});