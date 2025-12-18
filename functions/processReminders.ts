import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('Starting reminder processing...');
    
    // Get all cases with scheduled reminders
    const allCases = await base44.asServiceRole.entities.Case.list();
    const now = new Date();
    let processed = 0;
    let total_checked = 0;
    const results = [];
    
    for (const caseData of allCases) {
      if (!caseData.reminder_jobs?.length) continue;
      
      total_checked++;
      let needsUpdate = false;
      const updatedJobs = [...caseData.reminder_jobs];
      
      for (let i = 0; i < updatedJobs.length; i++) {
        const job = updatedJobs[i];
        
        if (job.status !== 'scheduled') continue;
        
        const runAt = new Date(job.run_at);
        if (runAt > now) continue;
        
        console.log(`Processing due job: ${job.job_id}, channel: ${job.channel}, target: ${job.target}`);
        
        // Job is due - process it
        try {
          if (job.channel === 'email') {
            await sendReminderEmail(base44, caseData, job);
          } else if (job.channel === 'whatsapp') {
            await sendReminderWhatsApp(caseData, job);
          }
          
          updatedJobs[i] = { 
            ...job, 
            status: 'sent', 
            attempts: job.attempts + 1,
            sent_at: now.toISOString()
          };
          processed++;
          results.push({
            case_id: caseData.id,
            job_id: job.job_id,
            status: 'sent',
            channel: job.channel,
            target: job.target
          });
          
          console.log(`Successfully sent reminder: ${job.job_id}`);
          
        } catch (error) {
          console.error(`Failed to send reminder ${job.job_id}:`, error);
          
          const maxAttempts = 3;
          const newAttempts = job.attempts + 1;
          
          if (newAttempts >= maxAttempts) {
            updatedJobs[i] = { 
              ...job, 
              status: 'failed', 
              attempts: newAttempts,
              last_error: error.message,
              failed_at: now.toISOString()
            };
            results.push({
              case_id: caseData.id,
              job_id: job.job_id,
              status: 'failed',
              error: error.message,
              channel: job.channel,
              target: job.target
            });
          } else {
            // Schedule retry with exponential backoff
            const delays = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]; // 5m, 30m, 2h
            const retryDelay = delays[newAttempts - 1] || delays[delays.length - 1];
            const retryAt = new Date(now.getTime() + retryDelay);
            
            updatedJobs[i] = { 
              ...job, 
              run_at: retryAt.toISOString(),
              attempts: newAttempts,
              last_error: error.message,
              retry_scheduled_at: now.toISOString()
            };
            
            console.log(`Scheduled retry ${newAttempts}/${maxAttempts} for ${job.job_id} at ${retryAt.toISOString()}`);
            results.push({
              case_id: caseData.id,
              job_id: job.job_id,
              status: 'retry_scheduled',
              retry_at: retryAt.toISOString(),
              attempts: newAttempts,
              channel: job.channel,
              target: job.target
            });
          }
        }
        
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await base44.asServiceRole.entities.Case.update(caseData.id, {
          reminder_jobs: updatedJobs,
          last_reminder_processed_at: now.toISOString()
        });
      }
    }
    
    console.log(`Reminder processing completed. Processed: ${processed}, Checked: ${total_checked}`);
    
    return Response.json({ 
      success: true, 
      processed,
      checked: total_checked,
      timestamp: now.toISOString(),
      results
    });

  } catch (error) {
    console.error('processReminders error:', error);
    return Response.json({ 
      error: 'Failed to process reminders', 
      details: error.message 
    }, { status: 500 });
  }
});

async function sendReminderEmail(base44, caseData, job) {
  const deadlineFormatted = new Date(caseData.deadline).toLocaleDateString('de-DE');
  const isOpponent = job.recipient_type === 'opponent';
  
  const subject = `Erinnerung: Frist endet am ${deadlineFormatted} – ${caseData.title || caseData.sender_name || 'Ihr Fall'}`;
  
  // Generate appropriate email content based on recipient
  const body = isOpponent ? 
    generateOpponentReminderEmail(caseData, deadlineFormatted, job) : 
    generateCustomerReminderEmail(caseData, deadlineFormatted, job);

  await base44.integrations.Core.SendEmail({
    to: job.target,
    subject,
    body,
    from_name: 'Widerspruch24 Fristerinnerung'
  });
}

function generateCustomerReminderEmail(caseData, deadlineFormatted, job) {
  const baseUrl = Deno.env.get('BASE_URL') || 'https://widerspruch24.com';
  
  return `Liebe/r Nutzer/in,

hiermit erinnern wir Sie daran, dass am ${deadlineFormatted} eine wichtige Frist abläuft.

Ihr Fall: ${caseData.title || caseData.sender_name || 'Unbenannt'}
${caseData.reference_number ? `Aktenzeichen: ${caseData.reference_number}` : ''}
${caseData.case_number ? `Fall-Nr.: ${caseData.case_number}` : ''}

Sie können den Fall in Ihrem Dashboard einsehen und weitere Schritte planen:
${baseUrl}/Dashboard

Falls Sie bereits gehandelt haben, können Sie diese Erinnerung ignorieren.

Bei Fragen zur Frist oder zu Ihrem Fall wenden Sie sich gerne an unseren Support.

Mit freundlichen Grüßen
Ihr Widerspruch24-Team

---
Diese automatische Erinnerung wurde über Widerspruch24.com versendet.
Erinnerungen verwalten: ${baseUrl}/Dashboard`;
}

function generateOpponentReminderEmail(caseData, deadlineFormatted, job) {
  const baseUrl = Deno.env.get('BASE_URL') || 'https://widerspruch24.com';
  
  return `Sehr geehrte Damen und Herren,

hiermit erinnern wir Sie daran, dass am ${deadlineFormatted} eine wichtige Frist abläuft.

Fall: ${caseData.title || caseData.sender_name || 'Unbenannt'}
${caseData.reference_number ? `Aktenzeichen: ${caseData.reference_number}` : ''}

Bitte prüfen Sie, ob bis zu diesem Datum Handlungsbedarf besteht.

Mit freundlichen Grüßen
Das Widerspruch24-Team

---
Diese automatische Erinnerung wurde über Widerspruch24.com versendet.
Abmelden: ${baseUrl}/unsubscribe?job=${job.job_id}`;
}

async function sendReminderWhatsApp(caseData, job) {
  // Only implement if WhatsApp API is configured
  const apiUrl = Deno.env.get('WHATSAPP_API_URL');
  const apiKey = Deno.env.get('WHATSAPP_API_KEY');
  
  if (!apiUrl || !apiKey) {
    throw new Error('WhatsApp API not configured');
  }
  
  const deadlineFormatted = new Date(caseData.deadline).toLocaleDateString('de-DE');
  const baseUrl = Deno.env.get('BASE_URL') || 'https://widerspruch24.com';
  
  const message = `🔔 Fristerinnerung: ${deadlineFormatted}

${caseData.title || caseData.sender_name || 'Ihr Fall'}
${caseData.reference_number ? `Az.: ${caseData.reference_number}` : ''}

Details: ${baseUrl}/Dashboard

Mit freundlichen Grüßen
Widerspruch24`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: job.target,
      message: message
    })
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${errorBody}`);
  }
  
  const result = await response.json();
  return result;
}