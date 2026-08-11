const store = require('../db/memoryStore');

const analyticsController = {
    // GET /api/analytics/calls
    getCallAnalytics: (req, res) => {
        try {
            const sessions = store.getCallSessions();
            const totalCalls = sessions.length;
            const completedCalls = sessions.filter(s => s.call_status === 'completed').length;
            const inProgressCalls = sessions.filter(s => s.call_status === 'in_progress').length;
            const failedCalls = sessions.filter(s => s.call_status === 'failed').length;

            const avgConfidence = totalCalls > 0
                ? (sessions.reduce((acc, s) => acc + (parseFloat(s.ai_confidence) || 0), 0) / totalCalls).toFixed(2)
                : 0.95;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                metrics: {
                    total_calls_initiated: totalCalls,
                    completed_calls: completedCalls,
                    in_progress_calls: inProgressCalls,
                    failed_calls: failedCalls,
                    call_success_rate: totalCalls > 0 ? `${((completedCalls / totalCalls) * 100).toFixed(1)}%` : "100%",
                    average_ai_confidence: parseFloat(avgConfidence)
                }
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to generate call analytics', details: error.message }));
        }
    },

    // GET /api/analytics/candidates
    getCandidateAnalytics: (req, res) => {
        try {
            const candidates = store.getCandidates();
            const schedules = store.getInterviewSchedules();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                metrics: {
                    total_candidates: candidates.length,
                    interviews_scheduled: schedules.filter(s => s.status === 'scheduled').length,
                    conversion_rate: candidates.length > 0 ? `${((schedules.length / candidates.length) * 100).toFixed(1)}%` : "0%"
                },
                candidates_summary: candidates
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to generate candidate analytics', details: error.message }));
        }
    },

    // GET /api/reports/transcripts
    getTranscriptReports: (req, res) => {
        try {
            const sessions = store.getCallSessions();
            const reports = sessions.map(s => {
                const candidate = store.getCandidateById(s.candidate_id);
                return {
                    call_id: s.call_id,
                    candidate_name: candidate ? candidate.full_name : 'Unknown Candidate',
                    candidate_phone: candidate ? candidate.phone_number : 'N/A',
                    call_status: s.call_status,
                    recording_url: s.recording_url,
                    transcript_text: s.transcript_text,
                    ai_confidence: s.ai_confidence,
                    responses: store.getCandidateResponsesByCallId(s.call_id)
                };
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                count: reports.length,
                reports
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to generate transcript reports', details: error.message }));
        }
    }
};

module.exports = analyticsController;
