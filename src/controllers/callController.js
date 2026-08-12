const store = require('../db/memoryStore');
const twilioService = require('../services/twilioService');

const callController = {

    initiateCall: async (req, res, payload) => {
        try {
            const candidateId = payload?.candidateId || payload?.candidate_id;
            const jobId = payload?.jobId || payload?.job_id;

            if (!candidateId || !jobId) {
                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    error: 'Missing required parameters: candidateId and jobId are required'
                }));
                return;
            }

            const candidate = store.getCandidateById(candidateId);
            const job = store.getJobById(jobId);

            if (!candidate) {
                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    error: 'Candidate not found',
                    candidate_id: candidateId
                }));
                return;
            }

            if (!job) {
                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    error: 'Job details not found',
                    job_id: jobId
                }));
                return;
            }

            const twilioResult = await twilioService.initiateCall({
                candidate,
                job
            });

            const callSession = store.addCallSession({
                call_id: twilioResult.callSid,
                candidate_id: candidate.candidate_id,
                call_start_time: new Date().toISOString(),
                call_status: 'in_progress',
                recording_url:
                    'https://api.twilio.com/2010-04-01/Recordings/' +
                    twilioResult.callSid +
                    '.mp3',
                transcript_text:
                    'Call initiated. Awaiting candidate response...',
                ai_confidence: 0.95
            });

            res.writeHead(201, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                status: 'success',
                message:
                    'Outbound AI recruitment call initiated to ' +
                    candidate.full_name,
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
                session_details: callSession
            }));

        } catch (error) {
            console.error('Initiate call error:', error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Failed to initiate call session',
                details: error.message
            }));
        }
    },

    getCallStatus: (req, res, callId) => {
        try {
            const session = store.getCallSessionById(callId);

            if (!session) {
                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    error: 'Call session not found',
                    call_id: callId
                }));

                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

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
            console.error('Get call status error:', error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Failed to retrieve call status',
                details: error.message
            }));
        }
    },

    handleWebhook: async (req, res, webhookPayload) => {
        try {
            const callSid =
                webhookPayload?.CallSid ||
                webhookPayload?.call_id ||
                'CA-' + Date.now();

            const queryString = req.url.includes('?')
    ? req.url.split('?')[1]
    : '';

const queryParams = new URLSearchParams(queryString);

const step =
    webhookPayload?.step ||
    queryParams.get('step') ||
    'initial';

            const speechResult =
                webhookPayload?.SpeechResult ||
                webhookPayload?.speech_result ||
                '';

            console.log('Twilio webhook received:', {
                callSid: callSid,
                step: step,
                speechResult: speechResult
            });

            if (step === 'process_response' && speechResult) {

                store.updateCallSession(callSid, {
                    call_status: 'in_progress',
                    transcript_text: speechResult,
                    ai_confidence: 0.90
                });

                const response = speechResult.toLowerCase();

                let reply;

                if (
                    response.includes('yes') ||
                    response.includes('sure') ||
                    response.includes('okay') ||
                    response.includes('ok')
                ) {
                    reply =
                        'Great. Thank you. Could you briefly tell me about your recent experience and the technologies you have worked with?';

                } else if (
                    response.includes('no') ||
                    response.includes('not now') ||
                    response.includes('busy')
                ) {
                    reply =
                        'No problem. Thank you for letting me know. We can follow up with you at another time. Goodbye!';

                } else {
                    reply =
                        'Thank you for sharing that. Could you tell me whether you are currently available for a new opportunity?';
                }

                const initialTwiml =
    twilioService.generateTwiMLResponse(
        'Hello. I am calling regarding your job application. Do you have a few minutes for a quick AI screening call?',
        'https://ai-recruitment-calling-assistant-dwie.onrender.com/api/calls/webhook?step=process_response'
    );

                res.writeHead(200, {
                    'Content-Type': 'text/xml'
                });

                res.end(twiml);
                return;
            }

            const initialTwiml =
                twilioService.generateTwiMLResponse(
                    'Hello. I am calling regarding your job application. Do you have a few minutes for a quick AI screening call?',
                    '/api/calls/webhook?step=process_response'
                );

            res.writeHead(200, {
                'Content-Type': 'text/xml'
            });

            res.end(initialTwiml);

        } catch (error) {
            console.error('Webhook error:', error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Webhook event handling failed',
                details: error.message
            }));
        }
    },

    getCallRecording: (req, res, callId) => {
        try {
            const session = store.getCallSessionById(callId);

            if (!session) {
                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    error: 'Call session not found',
                    call_id: callId
                }));

                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                status: 'success',
                call_id: session.call_id,
                recording_url:
                    session.recording_url ||
                    'https://api.twilio.com/2010-04-01/Recordings/' +
                    callId +
                    '.mp3',
                call_status: session.call_status
            }));

        } catch (error) {
            console.error('Get recording error:', error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Failed to retrieve call recording',
                details: error.message
            }));
        }
    },

    getCallTranscript: (req, res, callId) => {
        try {
            const session = store.getCallSessionById(callId);

            if (!session) {
                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    error: 'Call session not found',
                    call_id: callId
                }));

                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                status: 'success',
                call_id: session.call_id,
                transcript_text:
                    session.transcript_text ||
                    'Transcribing conversation...',
                ai_confidence:
                    session.ai_confidence || 0.95,
                responses:
                    store.getCandidateResponsesByCallId(callId)
            }));

        } catch (error) {
            console.error('Get transcript error:', error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Failed to retrieve call transcript',
                details: error.message
            }));
        }
    }
};

module.exports = callController;