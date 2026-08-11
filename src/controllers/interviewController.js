const store = require('../db/memoryStore');
const calendarService = require('../services/calendarService');

const interviewController = {
    // GET /api/interviews/availability
    getAvailability: async (req, res, query) => {
        try {
            const recruiterEmail = query?.interviewerEmail || query?.recruiter || 'recruiter@company.com';
            const date = query?.date || new Date().toISOString().split('T')[0];

            const availability = await calendarService.checkAvailability(recruiterEmail, date);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                data: availability
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to check interviewer availability', details: error.message }));
        }
    },

    // POST /api/interviews/schedule
    scheduleInterview: async (req, res, payload) => {
        try {
            const candidateId = payload?.candidateId || payload?.candidate_id;
            const jobId = payload?.jobId || payload?.job_id;
            const interviewDate = payload?.interviewDate || payload?.interview_date;
            const interviewTime = payload?.interviewTime || payload?.interview_time;
            const interviewerEmail = payload?.interviewerEmail || payload?.email || 'recruiter@company.com';

            if (!candidateId || !jobId || !interviewDate || !interviewTime) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required parameters: candidateId, jobId, interviewDate, interviewTime are required' }));
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
                res.end(JSON.stringify({ error: 'Job not found', job_id: jobId }));
                return;
            }

            // Create calendar event
            const eventResult = await calendarService.createInterviewEvent({
                candidate,
                job,
                interviewDate,
                interviewTime,
                interviewerEmail
            });

            // Store in interview_schedules
            const newSchedule = store.addInterviewSchedule({
                candidate_id: candidate.candidate_id,
                job_id: job.job_id,
                interview_date: interviewDate,
                interview_time: interviewTime,
                interviewer_name: interviewerEmail.split('@')[0],
                calendar_event_id: eventResult.calendar_event_id,
                status: 'scheduled'
            });

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: `Interview scheduled successfully for ${candidate.full_name}`,
                schedule_details: newSchedule,
                calendar_invite: eventResult
            }));
        } catch (error) {
            console.error('Schedule interview controller error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to schedule interview', details: error.message }));
        }
    },

    // PATCH /api/interviews/:id
    updateInterview: (req, res, id, updateFields) => {
        try {
            const schedules = store.getInterviewSchedules();
            const index = schedules.findIndex(s => s.schedule_id === id);

            if (index === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Interview schedule not found', schedule_id: id }));
                return;
            }

            schedules[index] = { ...schedules[index], ...updateFields };
            store.save();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: 'Interview schedule updated successfully',
                data: schedules[index]
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to update interview schedule', details: error.message }));
        }
    },

    // DELETE /api/interviews/:id
    cancelInterview: (req, res, id) => {
        try {
            const schedules = store.getInterviewSchedules();
            const index = schedules.findIndex(s => s.schedule_id === id);

            if (index === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Interview schedule not found', schedule_id: id }));
                return;
            }

            schedules[index].status = 'cancelled';
            store.save();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: 'Interview cancelled successfully',
                schedule_id: id
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to cancel interview', details: error.message }));
        }
    }
};

module.exports = interviewController;
