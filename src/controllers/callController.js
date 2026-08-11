const store = require('../db/memoryStore');
const twilioService = require('../services/twilioService');
const elevenlabsService = require('../services/elevenlabsService');
const assemblyAiService = require('../services/assemblyAiService');

const callController = {
    // POST /api/calls/initiate
    initiateCall: async (req, res, payload) => {
        try {
            const candidateId = payload?.candidateId || payload?.candidate_id;
            const jobId = payload?.jobId || payload?.job_id;

            if (!candidateId || !jobId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required parameters: candidateId and jobId are required' }));
                return;
            }

            const candidate = store.getCandidateById(candidateId);
            const job = store.getJobById(jobId);

            if (!candidate) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Candidate not found', candidate_id: candidateId }));
                return;
            }

            if (!job) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Job details not found', job_id: jobId }));
                return;
            }

            // Initiate outbound call via Twilio
            const twilioResult = await twilioService.initiateCall({ candidate, job });

            // Generate initial greeting prompt via ElevenLabs
            const greetingText = `Hello ${candidate.full_name}, I am calling regarding your application for the ${job.title} position at ${job.company_name}. Do you have a few minutes for a quick AI screening call?`;
            const voiceSample = await elevenlabsService.generateSpeech(greetingText);

            // Create call session in data store
            const callSession = store.addCallSession({
                call_id: twilioResult.callSid,
                candidate_id: candidate.candidate_id,
                call_start_time: new Date().toISOString(),
                call_status: 'in_progress',
                recording_url: `https://api.twilio.com/2010-04-01/Recordings/${twilioResult.callSid}.mp3`,
                transcript_text: 'Call initiated. Awaiting candidate response...',
                ai_confidence: 0.95
            });

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: `Outbound AI recruitment call initiated to ${candidate.full_name} (${candidate.phone_number})`,
                call_id: callSession.call_id,
                candidate: {
                    id: candidate.candidate_id,
                    name: candidate.full_name,
                    phone: candidate.phone_number
                },
                job: {
                    id: job.job_id,
                    title: job.title,
                    company: job.company_name
                },
                voice_greeting: voiceSample.text,
                session_details: callSession
            }));
        } catch (error) {
            console.error('Initiate call controller error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to initiate call session', details: error.message }));
        }
    },

    // GET /api/calls/:id/status
    getCallStatus: (req, res, callId) => {
        try {
            const session = store.getCallSessionById(callId);
            if (!session) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Call session not found', call_id: callId }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                call_id: session.call_id,
                candidate_id: session.candidate_id,
                call_status: session.call_status,
                start_time: session.call_start_time,
                end_time: session.call_end_time,
                ai_confidence: session.ai_confidence
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve call status', details: error.message }));
        }
    },

    // POST /api/calls/webhook (Twilio Call Lifecycle Event Receiver)
    handleWebhook: async (req, res, webhookPayload) => {
        try {
            const callSid = webhookPayload?.CallSid || webhookPayload?.call_id || `CA-${Date.now()}`;
            const recordingUrl = webhookPayload?.RecordingUrl || `https://api.twilio.com/2010-04-01/Recordings/${callSid}.mp3`;
            const duration = webhookPayload?.CallDuration || "45";

            // Trigger STT transcription via AssemblyAI
            const transcriptionResult = await assemblyAiService.transcribeAudio(recordingUrl);

            // Update call session
            const updatedSession = store.updateCallSession(callSid, {
                call_status: 'completed',
                call_end_time: new Date().toISOString(),
                recording_url: recordingUrl,
                transcript_text: transcriptionResult.transcript_text,
                ai_confidence: transcriptionResult.confidence || 0.96
            });

            // Return TwiML response or JSON confirmation
            const twiml = twilioService.generateTwiMLResponse("Thank you for sharing your preferences. Our recruiter will review your profile and follow up shortly. Goodbye!");

            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twiml);
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Webhook event handling failed', details: error.message }));
        }
    },

    // GET /api/calls/:id/recording
    getCallRecording: (req, res, callId) => {
        try {
            const session = store.getCallSessionById(callId);
            if (!session) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Call session not found', call_id: callId }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                call_id: session.call_id,
                recording_url: session.recording_url || `https://api.twilio.com/2010-04-01/Recordings/${callId}.mp3`,
                call_status: session.call_status
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve call recording', details: error.message }));
        }
    },

    // GET /api/calls/:id/transcript
    getCallTranscript: (req, res, callId) => {
        try {
            const session = store.getCallSessionById(callId);
            if (!session) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Call session not found', call_id: callId }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                call_id: session.call_id,
                transcript_text: session.transcript_text || "Transcribing conversation...",
                ai_confidence: session.ai_confidence || 0.95,
                responses: store.getCandidateResponsesByCallId(callId)
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve call transcript', details: error.message }));
        }
    }
};

module.exports = callController;
