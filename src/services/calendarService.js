/**
 * Google Calendar / Outlook Interview Scheduling Service
 */
const calendarService = {
    /**
     * Query recruiter availability for a given date
     */
    checkAvailability: async (recruiterEmail = 'recruiter@company.com', date = '2026-08-15') => {
        try {
            // Simulated freeBusy response with available time slots
            const slots = [
                { time: '10:00:00', available: true },
                { time: '11:30:00', available: true },
                { time: '14:00:00', available: true },
                { time: '15:30:00', available: false },
                { time: '16:30:00', available: true }
            ];

            return {
                recruiter: recruiterEmail,
                date,
                available_slots: slots.filter(s => s.available).map(s => s.time),
                all_slots: slots
            };
        } catch (error) {
            console.error('Check Availability Error:', error);
            throw error;
        }
    },

    /**
     * Create Calendar Invite Event (Google Calendar events.insert)
     */
    createInterviewEvent: async ({ candidate, job, interviewDate, interviewTime, interviewerEmail }) => {
        try {
            const eventId = `gcal_${Math.random().toString(36).substring(2, 12)}${Date.now()}`;
            const summary = `Technical Interview: ${candidate.full_name} - ${job.title}`;
            const description = `AI Screening completed. Interview for ${job.title} at ${job.company_name}.\nCandidate Email: ${candidate.email}\nCandidate Phone: ${candidate.phone_number}`;

            return {
                status: 'scheduled',
                calendar_event_id: eventId,
                summary,
                description,
                interview_date: interviewDate,
                interview_time: interviewTime,
                interviewer_email: interviewerEmail || 'recruiter@company.com',
                google_meet_link: `https://meet.google.com/abc-defg-hij`,
                created_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Create Interview Event Error:', error);
            throw error;
        }
    }
};

module.exports = calendarService;
