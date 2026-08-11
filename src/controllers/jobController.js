const store = require('../db/memoryStore');

const jobController = {
    // GET /api/jobs
    getAllJobs: (req, res) => {
        try {
            const jobs = store.getJobs();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                count: jobs.length,
                data: jobs
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve jobs', details: error.message }));
        }
    },

    // GET /api/jobs/:id
    getJobById: (req, res, id) => {
        try {
            const job = store.getJobById(id);
            if (!job) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Job description not found', job_id: id }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                data: job
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve job details', details: error.message }));
        }
    },

    // POST /api/jobs/sync
    syncJobs: (req, res, payload) => {
        try {
            let syncedJobs = [];

            if (Array.isArray(payload)) {
                syncedJobs = payload.map(j => store.addJob(j));
            } else if (payload && typeof payload === 'object') {
                syncedJobs = [store.addJob(payload)];
            } else {
                // Default sync simulation from Greenhouse/Zoho
                const defaultSyncedJob = store.addJob({
                    title: "Lead AI Conversational Engineer",
                    company_name: "ATS Greenhouse Sync",
                    location: "Hybrid / Austin, TX",
                    employment_type: "Full-Time",
                    salary_range: "$160,000 - $200,000",
                    jd_text: "Synced via ATS API integration. Responsible for speech engine tuning, Twilio websockets, and LLM prompt design."
                });
                syncedJobs = [defaultSyncedJob];
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: `Successfully synced ${syncedJobs.length} job(s) from ATS provider`,
                synced_count: syncedJobs.length,
                data: syncedJobs
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to sync jobs from ATS', details: error.message }));
        }
    }
};

module.exports = jobController;
