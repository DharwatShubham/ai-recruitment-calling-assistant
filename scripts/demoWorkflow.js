async function runDemo() {
    const BASE_URL = 'http://localhost:3000';
    console.log('--------------------------------------------------');
    console.log('🤖 AI RECRUITMENT CALLING ASSISTANT - END-TO-END DEMO');
    console.log('--------------------------------------------------\n');

    // 1. Health Check
    console.log('1️⃣  Checking Server Health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('   Response:', JSON.stringify(healthData, null, 2), '\n');

    // 2. Fetch Job Requisition
    console.log('2️⃣  Fetching Target Job Details (Greenhouse ATS)...');
    const jobsRes = await fetch(`${BASE_URL}/api/jobs`);
    const jobsData = await jobsRes.json();
    const targetJob = jobsData.data[0];
    console.log(`   Job Title: ${targetJob.title}`);
    console.log(`   Company: ${targetJob.company_name}`);
    console.log(`   Salary Range: ${targetJob.salary_range}\n`);

    // 3. Register Shortlisted Candidate
    console.log('3️⃣  Registering Shortlisted Candidate...');
    const candidateRes = await fetch(`${BASE_URL}/api/candidates/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
            full_name: "Robert Downey",
            phone_number: "+14155559876",
            email: "robert.downey@example.com"
        }])
    });
    const candidateData = await candidateRes.json();
    const candidate = candidateData.data[0];
    console.log(`   Candidate ID: ${candidate.candidate_id}`);
    console.log(`   Candidate Name: ${candidate.full_name}`);
    console.log(`   Phone Number: ${candidate.phone_number}\n`);

    // 4. Initiate Outbound Call
    console.log('4️⃣  Initiating Outbound AI Screening Call (Twilio + ElevenLabs)...');
    const callRes = await fetch(`${BASE_URL}/api/calls/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            candidateId: candidate.candidate_id,
            jobId: targetJob.job_id
        })
    });
    const callData = await callRes.json();
    console.log(`   Call SID: ${callData.call_id}`);
    console.log(`   Call Status: ${callData.session_details.call_status}`);
    console.log(`   Voice Greeting Generated: "${callData.voice_greeting}"\n`);

    // 5. Trigger Webhook Event (Call Answered & Recording Transcribed via AssemblyAI)
    console.log('5️⃣  Simulating Candidate Speech & AssemblyAI Transcription...');
    const webhookRes = await fetch(`${BASE_URL}/api/calls/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            CallSid: callData.call_id,
            CallDuration: '75'
        })
    });
    const twimlText = await webhookRes.text();
    console.log('   Twilio TwiML Response:\n' + twimlText + '\n');

    // 6. Fetch Transcribed Transcript & Extracted NLP Data
    console.log('6️⃣  Fetching Transcribed Conversation & NLP Extraction...');
    const transcriptRes = await fetch(`${BASE_URL}/api/calls/${callData.call_id}/transcript`);
    const transcriptData = await transcriptRes.json();
    console.log(`   Transcript Text: "${transcriptData.transcript_text}"`);
    console.log(`   AI Confidence Score: ${transcriptData.ai_confidence}\n`);

    // 7. Check Interviewer Availability
    console.log('7️⃣  Checking Recruiter Calendar Availability...');
    const availRes = await fetch(`${BASE_URL}/api/interviews/availability?date=2026-08-18`);
    const availData = await availRes.json();
    console.log(`   Available Time Slots: ${availData.data.available_slots.join(', ')}\n`);

    // 8. Schedule Interview on Google Calendar
    console.log('8️⃣  Scheduling Technical Interview (Google Calendar)...');
    const scheduleRes = await fetch(`${BASE_URL}/api/interviews/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            candidateId: candidate.candidate_id,
            jobId: targetJob.job_id,
            interviewDate: '2026-08-18',
            interviewTime: '14:00:00',
            interviewerEmail: 'recruiter@company.com'
        })
    });
    const scheduleData = await scheduleRes.json();
    console.log(`   Schedule ID: ${scheduleData.schedule_details.schedule_id}`);
    console.log(`   Calendar Event: ${scheduleData.calendar_invite.summary}`);
    console.log(`   Google Meet Link: ${scheduleData.calendar_invite.google_meet_link}`);
    console.log(`   Interview Date & Time: ${scheduleData.schedule_details.interview_date} at ${scheduleData.schedule_details.interview_time}\n`);

    // 9. Fetch System Analytics
    console.log('9️⃣  System Call Metrics & Analytics Dashboard...');
    const analyticsRes = await fetch(`${BASE_URL}/api/analytics/calls`);
    const analyticsData = await analyticsRes.json();
    console.log('   Metrics:', JSON.stringify(analyticsData.metrics, null, 2), '\n');

    console.log('--------------------------------------------------');
    console.log('✅ DEMO WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
}

runDemo();
