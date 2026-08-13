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
        // ========================================================
        // 1. Get Twilio call information
        // ========================================================

        const callSid =
            webhookPayload?.CallSid ||
            webhookPayload?.call_id;

        const step =
            webhookPayload?.step || 'initial';

        const speechResult =
            webhookPayload?.SpeechResult ||
            webhookPayload?.speech_result ||
            '';

         const phoneNumber =
    webhookPayload?.To ||
    webhookPayload?.to ||
    webhookPayload?.From ||
    webhookPayload?.from ||
    '';

        console.log('Twilio webhook received:', {
            callSid,
            step,
            speechResult
        });


        // ========================================================
// 2. Find candidate using phone number
// ========================================================

const candidate =
    store.getCandidateByPhone(phoneNumber);

console.log('Candidate found for call:', {
    phoneNumber,
    candidateId: candidate?.candidate_id,
    candidateName: candidate?.full_name
});


// ========================================================
// 3. Initial call
// ========================================================

        if (step === 'initial' || !callSid) {

            const initialQuestion =
    'Hello. I am calling from WINIT regarding your job application. ' +
    'Do you have a few minutes for a quick AI screening call?';

            const initialTwiml =
                twilioService.generateTwiMLResponse(
                    initialQuestion,
                    'https://ai-recruitment-calling-assistant-dwie.onrender.com/api/calls/webhook?step=process_response'
                );

            res.writeHead(200, {
                'Content-Type': 'text/xml'
            });

            res.end(initialTwiml);

            return;
        }


        // ========================================================
        // 3. Get existing call session
        // ========================================================

        let existingSession =
            store.getCallSessionById(callSid);


        // ========================================================
        // 4. Create session if it does not exist
        // ========================================================

if (!existingSession) {

    existingSession = store.addCallSession({
        call_id: callSid,
        candidate_id:
            candidate ? candidate.candidate_id : null,
                call_start_time: new Date().toISOString(),
                call_status: 'in_progress',
                transcript_text: '',
                ai_confidence: 0.95,

                // Question currently being asked
                question_index: 0,

                // Number of questions answered
                questions_answered: 0
            });
        }


        // ========================================================
        // 5. Define the 5 recruitment questions
        // ========================================================

       const questions = [

    {
        code: 'AVAILABILITY',
        text:
            'Great. Thank you. Are you currently available ' +
            'for a new job opportunity?'
    },

    {
        code: 'EXPERIENCE',
        text:
            'Could you briefly tell me about your recent ' +
            'professional experience?'
    },

    {
        code: 'TECHNOLOGIES',
        text:
            'What technologies, programming languages, ' +
            'or tools have you worked with recently?'
    },

    {
        code: 'ROLE_INTEREST',
        text:
            'What interests you most about this role, ' +
            'and why do you think you would be a good fit?'
    },

    {
        code: 'EXPECTED_CTC',
        text:
            'What are your expected CTC for this role?'
    },

    {
        code: 'RELOCATION',
        text:
            'This role is based in Hyderabad. ' +
            'Would you be comfortable relocating to Hyderabad for this role?'
    },

    {
        code: 'INTERVIEW_AVAILABILITY',
        text:
            'If you are shortlisted, would you be available ' +
            'for an interview based on the available time slots?'
    },

    {
        code: 'NOTICE_PERIOD',
        text:
            'Could you tell me your current notice period ' +
            'or how soon you would be available to join?'
    }

];

        // ========================================================
        // 6. Handle candidate's response
        // ========================================================

        if (step === 'process_response') {

            const currentQuestionIndex =
                Number(existingSession.question_index || 0);

            const candidateAnswer =
                speechResult.trim();


            // ----------------------------------------------------
            // If candidate did not respond
            // ----------------------------------------------------

            if (!candidateAnswer) {

                const currentQuestion =
                    questions[currentQuestionIndex];

                const retryMessage =
                    'I am sorry, I did not hear your response. ' +
                    currentQuestion.text;

                const retryTwiml =
                    twilioService.generateTwiMLResponse(
                        retryMessage,
                        'https://ai-recruitment-calling-assistant-dwie.onrender.com/api/calls/webhook?step=process_response'
                    );

                res.writeHead(200, {
                    'Content-Type': 'text/xml'
                });

                res.end(retryTwiml);

                return;
            }


            // ----------------------------------------------------
            // Save candidate response
            // ----------------------------------------------------

            const previousTranscript =
                existingSession.transcript_text || '';

            const questionNumber =
                currentQuestionIndex + 1;

            const currentQuestion =
                questions[currentQuestionIndex];


            const updatedTranscript =
                previousTranscript +
                '\nQuestion ' +
                questionNumber +
                ': ' +
                currentQuestion.text +
                '\nCandidate: ' +
                candidateAnswer +
                '\n';


            // ----------------------------------------------------
            // Update call session
            // ----------------------------------------------------

            store.updateCallSession(
                callSid,
                {
                    call_status: 'in_progress',

                    transcript_text:
                        updatedTranscript,

                    ai_confidence:
                        0.90,

                    questions_answered:
                        questionNumber
                }
            );


            // ----------------------------------------------------
            // Save structured candidate response
            // ----------------------------------------------------

            store.addCandidateResponse({
                call_id: callSid,

                question_code:
                    currentQuestion.code,

                response_text:
                    candidateAnswer,

                response_value:
                    candidateAnswer
            });


            // ====================================================
            // 7. Check whether all 5 questions are completed
            // ====================================================

            if (currentQuestionIndex >= questions.length - 1) {

                store.updateCallSession(
                    callSid,
                    {
                        call_status: 'completed',

                        call_end_time:
                            new Date().toISOString(),

                        questions_answered:
                            questions.length,

                        ai_confidence:
                            0.93
                    }
                );


                const completionMessage =
                    'Thank you for your time and for answering ' +
                    'all of my questions. Your responses have been ' +
                    'recorded and our recruitment team will review ' +
                    'your application. We will contact you regarding ' +
                    'the next steps. Have a great day. Goodbye!';


                const completionTwiml =
                    twilioService.generateTwiMLResponse(
                        completionMessage,
                        ''
                    );


                res.writeHead(200, {
                    'Content-Type': 'text/xml'
                });

                res.end(completionTwiml);

                return;
            }


            // ====================================================
            // 8. Move to the next question
            // ====================================================

            const nextQuestionIndex =
                currentQuestionIndex + 1;

            const nextQuestion =
                questions[nextQuestionIndex];


            store.updateCallSession(
                callSid,
                {
                    question_index:
                        nextQuestionIndex,

                    call_status:
                        'in_progress'
                }
            );


            // ----------------------------------------------------
            // Generate next question
            // ----------------------------------------------------

            const nextQuestionTwiml =
                twilioService.generateTwiMLResponse(
                    nextQuestion.text,
                    'https://ai-recruitment-calling-assistant-dwie.onrender.com/api/calls/webhook?step=process_response'
                );


            res.writeHead(200, {
                'Content-Type': 'text/xml'
            });

            res.end(nextQuestionTwiml);

            return;
        }


        // ========================================================
        // 9. Fallback
        // ========================================================

        const fallbackTwiml =
            twilioService.generateTwiMLResponse(
                'Thank you for your time. Goodbye!',
                ''
            );

        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });

        res.end(fallbackTwiml);


    } catch (error) {

        console.error(
            'Webhook error:',
            error
        );


        if (!res.headersSent) {

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(
                JSON.stringify({
                    error:
                        'Webhook event handling failed',

                    details:
                        error.message
                })
            );
        }
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
    },
    getAllCalls: async (req, res) => {
        try {
            const sessions = store.getCallSessions();

            const calls = sessions.map(session => {
                const candidate = session.candidate_id
                    ? store.getCandidateById(session.candidate_id)
                    : null;

                return {
                    call_id: session.call_id,
                    candidate_id: session.candidate_id || null,
                    candidate_name: candidate
                        ? candidate.full_name
                        : 'Unknown Candidate',
                    phone_number: candidate
                        ? candidate.phone_number
                        : 'N/A',
                    call_status: session.call_status,
                    start_time: session.call_start_time,
                    end_time: session.call_end_time,
                    ai_confidence: session.ai_confidence
                };
            });

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                status: 'success',
                count: calls.length,
                data: calls
            }));

        } catch (error) {
            console.error('Error fetching calls:', error);

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                status: 'error',
                message: 'Failed to fetch calls'
            }));
        }
    },
};

module.exports = callController;