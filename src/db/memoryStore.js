const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');


const DATA_FILE = path.join(__dirname, '../../data_store.json');

// Initial seed data for demonstration and testing
const initialData = {
    candidates: [
        {
            candidate_id: "123e4567-e89b-12d3-a456-426614174000",
            full_name: "John Doe",
            phone_number: "+1234567890",
            email: "john.doe@example.com",
            source: "ATS",
            ats_id: "GH-8901",
            created_at: new Date().toISOString()
        },
        {
            candidate_id: "123e4567-e89b-12d3-a456-426614174001",
            full_name: "Jane Smith",
            phone_number: "+1987654321",
            email: "jane.smith@example.com",
            source: "Manual",
            ats_id: "GH-8902",
            created_at: new Date().toISOString()
        }
    ],
    jobs: [
        {
            job_id: "456e7890-e89b-12d3-a456-426614174001",
            title: "Senior Backend Engineer",
            company_name: "TechCorp Global",
            location: "Remote / New York",
            employment_type: "Full-Time",
            salary_range: "$130,000 - $160,000",
            jd_text: "Seeking a Senior Backend Engineer with Node.js, PostgreSQL, microservices, and system architecture experience.",
            created_at: new Date().toISOString()
        },
        {
            job_id: "456e7890-e89b-12d3-a456-426614174002",
            title: "AI Systems Specialist",
            company_name: "InnovateAI Labs",
            location: "San Francisco, CA",
            employment_type: "Full-Time",
            salary_range: "$150,000 - $190,000",
            jd_text: "Join our team building voice-enabled conversational AI agents and LLM integrations.",
            created_at: new Date().toISOString()
        }
    ],
    recruiters: [
        {
            recruiter_id: "789e0123-e89b-12d3-a456-426614174002",
            full_name: "Sarah Jenkins",
            phone_number: "+1555019283",
            email: "recruiter@company.com",
            company_name: "TechCorp Global",
            created_at: new Date().toISOString()
        }
    ],
    call_sessions: [],
    candidate_responses: [],
    interview_schedules: []
};

class DataStore {
    constructor() {
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const fileData = fs.readFileSync(DATA_FILE, 'utf8');
                this.data = JSON.parse(fileData);
            } else {
                this.data = initialData;
                this.save();
            }
        } catch (err) {
            console.error('Error loading data store file:', err);
            this.data = initialData;
        }
    }

    save() {
        try {
            const dir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (err) {
            console.error('Error saving data store file:', err);
        }
    }

    // Candidates
    getCandidates() {
        return this.data.candidates;
    }

    getCandidateById(id) {
        return this.data.candidates.find(c => c.candidate_id === id);
    }
    
    getCandidateByPhone(phone) {
    if (!phone) return null;

    const normalizePhone = value =>
        String(value || '').replace(/\D/g, '');

    const normalizedPhone = normalizePhone(phone);

    return this.data.candidates.find(candidate =>
        normalizePhone(candidate.phone_number) === normalizedPhone
    ) || null;
}

    addCandidate(candidateData) {
        const newCandidate = {
            candidate_id: randomUUID(),
            full_name: candidateData.full_name || candidateData.name || 'Unknown Candidate',
            phone_number: candidateData.phone_number || candidateData.phone || '',
            email: candidateData.email || '',
            source: candidateData.source || 'manual',
            ats_id: candidateData.ats_id || `ATS-${Date.now()}`,
            created_at: new Date().toISOString()
        };
        this.data.candidates.push(newCandidate);
        this.save();
        return newCandidate;
    }

    updateCandidate(id, updateFields) {
        const index = this.data.candidates.findIndex(c => c.candidate_id === id);
        if (index === -1) return null;
        this.data.candidates[index] = { ...this.data.candidates[index], ...updateFields };
        this.save();
        return this.data.candidates[index];
    }

    deleteCandidate(id) {
        const initialLen = this.data.candidates.length;
        this.data.candidates = this.data.candidates.filter(c => c.candidate_id !== id);
        this.save();
        return this.data.candidates.length < initialLen;
    }

    // Jobs
    getJobs() {
        return this.data.jobs;
    }

    getJobById(id) {
        return this.data.jobs.find(j => j.job_id === id);
    }

    addJob(jobData) {
        const newJob = {
            job_id: randomUUID(),
            title: jobData.title || 'Untitled Job',
            company_name: jobData.company_name || 'Company',
            location: jobData.location || 'Remote',
            employment_type: jobData.employment_type || 'Full-Time',
            salary_range: jobData.salary_range || 'Competitive',
            jd_text: jobData.jd_text || '',
            created_at: new Date().toISOString()
        };
        this.data.jobs.push(newJob);
        this.save();
        return newJob;
    }

    // Call Sessions
    getCallSessions() {
        return this.data.call_sessions;
    }

    getCallSessionById(id) {
        return this.data.call_sessions.find(cs => cs.call_id === id);
    }

    addCallSession(sessionData) {
        const newSession = {
            call_id: sessionData.call_id || randomUUID(),
            candidate_id: sessionData.candidate_id,
            call_start_time: sessionData.call_start_time || new Date().toISOString(),
            call_end_time: sessionData.call_end_time || null,
            call_status: sessionData.call_status || 'initiated',
            recording_url: sessionData.recording_url || '',
            transcript_text: sessionData.transcript_text || '',
            ai_confidence: sessionData.ai_confidence || 0.95,
            created_at: new Date().toISOString()
        };
        this.data.call_sessions.push(newSession);
        this.save();
        return newSession;
    }

    updateCallSession(id, updateFields) {
        const index = this.data.call_sessions.findIndex(cs => cs.call_id === id);
        if (index === -1) return null;
        this.data.call_sessions[index] = { ...this.data.call_sessions[index], ...updateFields };
        this.save();
        return this.data.call_sessions[index];
    }

    // Candidate Responses
    addCandidateResponse(responseData) {
        const newResp = {
            response_id: randomUUID(),
            call_id: responseData.call_id,
            question_code: responseData.question_code,
            response_text: responseData.response_text,
            response_value: responseData.response_value,
            created_at: new Date().toISOString()
        };
        this.data.candidate_responses.push(newResp);
        this.save();
        return newResp;
    }

    getCandidateResponsesByCallId(callId) {
        return this.data.candidate_responses.filter(cr => cr.call_id === callId);
    }

    // Interview Schedules
    getInterviewSchedules() {
        return this.data.interview_schedules;
    }

    addInterviewSchedule(scheduleData) {
        const newSchedule = {
            schedule_id: randomUUID(),
            candidate_id: scheduleData.candidate_id,
            job_id: scheduleData.job_id,
            interview_date: scheduleData.interview_date,
            interview_time: scheduleData.interview_time,
            interviewer_name: scheduleData.interviewer_name || 'Recruiter',
            calendar_event_id: scheduleData.calendar_event_id || `CAL-${Date.now()}`,
            status: scheduleData.status || 'scheduled',
            created_at: new Date().toISOString()
        };
        this.data.interview_schedules.push(newSchedule);
        this.save();
        return newSchedule;
    }
}

module.exports = new DataStore();
