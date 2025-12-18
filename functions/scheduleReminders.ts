import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { caseId } = await req.json();
    
    if (!caseId) {
      return Response.json({ error: 'Case ID required' }, { status: 400 });
    }

    // Get case data with service role for full access
    const caseData = await base44.asServiceRole.entities.Case.get(caseId);
    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if scheduling is needed
    if (!caseData.notify?.enabled || !caseData.deadline) {
      return Response.json({ 
        success: false, 
        reason: 'No scheduling needed - notifications disabled or no deadline set'
      });
    }

    console.log(`Scheduling reminders for case ${caseId}, deadline: ${caseData.deadline}`);

    // Clear existing jobs
    const updatedJobs = [];
    
    // Calculate reminder datetime
    const deadlineDate = new Date(caseData.deadline + 'T00:00:00');
    const daysBefore = caseData.notify.days_before || 2;
    const reminderDate = new Date(deadlineDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    
    // Set time to 08:15 (after quiet hours, before work starts)
    const quietHours = caseData.notify.quiet_hours || { start: '21:00', end: '08:00' };
    const [endHour, endMin] = quietHours.end.split(':');
    reminderDate.setHours(parseInt(endHour) + 1, parseInt(endMin) + 15, 0, 0); // 15 minutes after quiet hours end
    
    const now = new Date();
    
    // Only schedule if reminder is in the future
    if (reminderDate > now) {
      const { recipients, channels } = caseData.notify;
      
      // Schedule email reminder for customer (primary user)
      if (recipients?.customer?.email && channels?.email) {
        updatedJobs.push({
          job_id: `${caseId}-customer-email-${Date.now()}`,
          run_at: reminderDate.toISOString(),
          channel: 'email',
          target: recipients.customer.email,
          recipient_type: 'customer',
          status: 'scheduled',
          attempts: 0,
          created_at: now.toISOString()
        });
        console.log(`Scheduled email reminder for customer: ${recipients.customer.email}`);
      }
      
      // Schedule for opponent/third party (if consented)
      if (recipients?.opponent?.consent_at) {
        const consentDate = new Date(recipients.opponent.consent_at);
        const now = new Date();
        
        // Check consent is not older than 1 year
        if ((now - consentDate) < (365 * 24 * 60 * 60 * 1000)) {
          
          if (recipients.opponent.email && channels?.email) {
            updatedJobs.push({
              job_id: `${caseId}-opponent-email-${Date.now()}`,
              run_at: reminderDate.toISOString(),
              channel: 'email',
              target: recipients.opponent.email,
              recipient_type: 'opponent',
              status: 'scheduled',
              attempts: 0,
              created_at: now.toISOString()
            });
            console.log(`Scheduled email reminder for opponent: ${recipients.opponent.email}`);
          }
          
          // WhatsApp (only if API is configured)
          if (recipients.opponent.whatsapp && channels?.whatsapp && Deno.env.get('WHATSAPP_API_URL')) {
            updatedJobs.push({
              job_id: `${caseId}-opponent-whatsapp-${Date.now()}`,
              run_at: reminderDate.toISOString(),
              channel: 'whatsapp',
              target: recipients.opponent.whatsapp,
              recipient_type: 'opponent',
              status: 'scheduled',
              attempts: 0,
              created_at: now.toISOString()
            });
            console.log(`Scheduled WhatsApp reminder for opponent: ${recipients.opponent.whatsapp}`);
          }
        } else {
          console.log(`Opponent consent expired (${consentDate}), not scheduling`);
        }
      }
    } else {
      console.log(`Reminder date ${reminderDate} is in the past, not scheduling`);
    }
    
    // Update case with new jobs
    await base44.asServiceRole.entities.Case.update(caseId, {
      reminder_jobs: updatedJobs,
      last_reminder_scheduled_at: now.toISOString()
    });
    
    return Response.json({ 
      success: true, 
      scheduled: updatedJobs.length,
      reminder_date: updatedJobs.length > 0 ? reminderDate.toISOString() : null,
      jobs: updatedJobs.map(job => ({
        id: job.job_id,
        channel: job.channel,
        target: job.target,
        run_at: job.run_at
      }))
    });

  } catch (error) {
    console.error('scheduleReminders error:', error);
    return Response.json({ 
      error: 'Failed to schedule reminders', 
      details: error.message 
    }, { status: 500 });
  }
});