-- Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: candidates
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    source VARCHAR(50),
    ats_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: jobs
CREATE TABLE IF NOT EXISTS jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    employment_type VARCHAR(50),
    salary_range VARCHAR(50),
    jd_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: recruiters
CREATE TABLE IF NOT EXISTS recruiters (
    recruiter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: call_sessions
CREATE TABLE IF NOT EXISTS call_sessions (
    call_id TEXT PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    call_start_time TIMESTAMP WITH TIME ZONE,
    call_end_time TIMESTAMP WITH TIME ZONE,
    call_status VARCHAR(20),
    recording_url TEXT,
    transcript_text TEXT,
    ai_confidence DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: candidate_responses
CREATE TABLE IF NOT EXISTS candidate_responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id TEXT REFERENCES call_sessions(call_id) ON DELETE CASCADE,
    question_code VARCHAR(50),
    response_text TEXT,
    response_value VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: interview_schedules
CREATE TABLE IF NOT EXISTS interview_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
    interview_date DATE,
    interview_time TIME,
    interviewer_name VARCHAR(150),
    calendar_event_id VARCHAR(150),
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
