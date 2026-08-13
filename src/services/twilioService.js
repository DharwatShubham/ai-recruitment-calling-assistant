const twilioService = {

    // ============================================================
    // Initiate Twilio Call
    // ============================================================

    initiateCall: async ({ candidate, job, webhookUrl }) => {

        const accountSid =
            process.env.TWILIO_ACCOUNT_SID;

        const authToken =
            process.env.TWILIO_AUTH_TOKEN;

        const fromNumber =
            process.env.TWILIO_PHONE_NUMBER;


        const callbackUrl =
            webhookUrl ||
            process.env.TWILIO_WEBHOOK_URL ||
            'https://ai-recruitment-calling-assistant-dwie.onrender.com/api/calls/webhook';


        if (!accountSid || !authToken) {

            throw new Error(
                'Twilio credentials are missing. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
            );
        }


        if (!fromNumber) {

            throw new Error(
                'TWILIO_PHONE_NUMBER is missing.'
            );
        }


        const authHeader =
            'Basic ' +
            Buffer
                .from(
                    accountSid +
                    ':' +
                    authToken
                )
                .toString('base64');


        const formData =
            new URLSearchParams({

                To:
                    candidate.phone_number,

                From:
                    fromNumber,

                Url:
                    callbackUrl
            });


        const response =
            await fetch(
                'https://api.twilio.com/2010-04-01/Accounts/' +
                accountSid +
                '/Calls.json',
                {
                    method: 'POST',

                    headers: {
                        Authorization:
                            authHeader,

                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },

                    body:
                        formData.toString()
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                'Twilio API call failed'
            );
        }


        return {

            status:
                'initiated',

            callSid:
                data.sid,

            to:
                candidate.phone_number,

            from:
                fromNumber
        };
    },


    // ============================================================
    // Generate TwiML
    // ============================================================

    generateTwiMLResponse: (promptText, actionUrl) => {

        // --------------------------------------------------------
        // Final message
        // --------------------------------------------------------

        if (!actionUrl) {

            return (
                '<?xml version="1.0" encoding="UTF-8"?>' +

                '<Response>' +

                '<Say voice="Polly.Joanna-Neural">' +
                promptText +
                '</Say>' +

                '<Hangup/>' +

                '</Response>'
            );
        }


        // --------------------------------------------------------
        // Normal recruitment question
        // --------------------------------------------------------

        return (
            '<?xml version="1.0" encoding="UTF-8"?>' +

            '<Response>' +

            '<Gather ' +

            'input="speech" ' +

            'action="' +
            actionUrl +
            '" ' +

            'method="POST" ' +

            'speechTimeout="auto" ' +

            'language="en-US">' +

            '<Say voice="Polly.Joanna-Neural">' +
            promptText +
            '</Say>' +

            '</Gather>' +

            '<Say voice="Polly.Joanna-Neural">' +

            "I didn't hear a response. " +
            "Thank you for your time. Goodbye!" +

            '</Say>' +

            '<Hangup/>' +

            '</Response>'
        );
    }
};


// ============================================================
// Export
// ============================================================

module.exports = twilioService;