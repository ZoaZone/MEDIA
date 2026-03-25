import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get active sequences
    const sequences = await base44.asServiceRole.entities.FollowUpSequence.filter({ status: 'active' });

    let processed = 0;

    for (const seq of sequences) {
      // Get steps for this sequence
      const steps = await base44.asServiceRole.entities.FollowUpStep.filter(
        { sequence_id: seq.id, status: 'active' },
        'step_order'
      );

      for (const step of steps) {
        // In a real implementation, this would:
        // 1. Check contacts that need this step (based on delay_hours from previous step)
        // 2. Send message via the appropriate channel (email/sms/whatsapp)
        // 3. Log the result
        // 4. Advance contact to next step
        processed++;
      }
    }

    return Response.json({
      success: true,
      active_sequences: sequences.length,
      steps_processed: processed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});