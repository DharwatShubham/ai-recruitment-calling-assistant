const API_BASE = "";

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
}


// ------------------------------------------------------------
// Health
// ------------------------------------------------------------

async function loadHealth() {
    try {
        const data = await apiRequest("/health");

        document.getElementById("serverStatus").textContent = "ONLINE";
        document.getElementById("serverStatusCard").textContent = "ONLINE";

    } catch (error) {
        document.getElementById("serverStatus").textContent = "OFFLINE";
        document.getElementById("serverStatusCard").textContent = "OFFLINE";

        console.error("Health check failed:", error);
    }
}


// ------------------------------------------------------------
// Candidates
// ------------------------------------------------------------

async function loadCandidates() {
    try {
        const response = await apiRequest("/api/candidates");

        const candidates = response.data || [];

        document.getElementById("candidateCount").textContent =
            response.count ?? candidates.length;

        const tableBody = document.getElementById("candidateTableBody");

        if (candidates.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">No candidates found.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = candidates.map(candidate => `
            <tr>
                <td><strong>${escapeHtml(candidate.full_name)}</strong></td>
                <td>${escapeHtml(candidate.email)}</td>
                <td>${escapeHtml(candidate.phone_number)}</td>
                <td>${escapeHtml(candidate.source)}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Candidates API error:", error);

        document.getElementById("candidateTableBody").innerHTML = `
            <tr>
                <td colspan="4" class="error">
                    Failed to load candidates.
                </td>
            </tr>
        `;
    }
}


// ------------------------------------------------------------
// Jobs
// ------------------------------------------------------------

async function loadJobs() {
    try {
        const response = await apiRequest("/api/jobs");

        const jobs = response.data || [];

        document.getElementById("jobCount").textContent =
            response.count ?? jobs.length;

        const tableBody = document.getElementById("jobTableBody");

        if (jobs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">No jobs found.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = jobs.map(job => `
            <tr>
                <td><strong>${escapeHtml(job.title)}</strong></td>
                <td>${escapeHtml(job.company_name)}</td>
                <td>${escapeHtml(job.location)}</td>
                <td>${escapeHtml(job.employment_type)}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Jobs API error:", error);

        document.getElementById("jobTableBody").innerHTML = `
            <tr>
                <td colspan="4" class="error">
                    Failed to load jobs.
                </td>
            </tr>
        `;
    }
}


// ------------------------------------------------------------
// Call Analytics
// ------------------------------------------------------------

async function loadCallAnalytics() {
    try {
        const response = await apiRequest("/api/analytics/calls");

        const metrics = response.metrics || {};

        document.getElementById("totalCalls").textContent =
            metrics.total_calls_initiated ?? "—";

        document.getElementById("completedCalls").textContent =
            metrics.completed_calls ?? "—";

        document.getElementById("inProgressCalls").textContent =
            metrics.in_progress_calls ?? "—";

        document.getElementById("failedCalls").textContent =
            metrics.failed_calls ?? "—";

        document.getElementById("analyticsSuccessRate").textContent =
            metrics.call_success_rate ?? "—";

        document.getElementById("successRate").textContent =
            metrics.call_success_rate ?? "—";

        document.getElementById("aiConfidence").textContent =
            metrics.average_ai_confidence ?? "—";

    } catch (error) {
        console.error("Call analytics error:", error);
    }
}


// ------------------------------------------------------------
// Candidate Analytics
// ------------------------------------------------------------

async function loadCandidateAnalytics() {
    try {
        const response = await apiRequest("/api/analytics/candidates");

        const metrics = response.metrics || {};

        document.getElementById("totalCandidates").textContent =
            metrics.total_candidates ?? "—";

        document.getElementById("interviewsScheduled").textContent =
            metrics.interviews_scheduled ?? "—";

        document.getElementById("conversionRate").textContent =
            metrics.conversion_rate ?? "—";

    } catch (error) {
        console.error("Candidate analytics error:", error);
    }
}


// ------------------------------------------------------------
// Interview Availability
// ------------------------------------------------------------

async function loadAvailability() {
    try {
        const response = await apiRequest(
            "/api/interviews/availability"
        );

        const data = response.data || {};

        document.getElementById("availabilityRecruiter").textContent =
            `Recruiter: ${data.recruiter || "—"} | Date: ${data.date || "—"}`;

        const allSlots = data.all_slots || [];

        document.getElementById("availabilitySlots").innerHTML =
            allSlots.map(slot => `
                <div class="slot ${slot.available ? "" : "unavailable"}">
                    ${escapeHtml(slot.time)}
                    ${slot.available ? "✓ Available" : "✕ Unavailable"}
                </div>
            `).join("");

    } catch (error) {
        console.error("Availability error:", error);

        document.getElementById("availabilityRecruiter").textContent =
            "Failed to load availability.";
    }
}


// ------------------------------------------------------------
// Transcript Reports
// ------------------------------------------------------------

async function loadTranscriptReports() {
    try {
        const response = await apiRequest(
            "/api/reports/transcripts"
        );

        const reports = response.reports || [];

        const container =
            document.getElementById("transcriptReports");

        if (reports.length === 0) {
            container.innerHTML = "No transcript reports found.";
            return;
        }

        container.innerHTML = reports.map(report => `
            <div class="report">

                <div class="report-title">
                    ${escapeHtml(
                        report.candidate_name || "Unknown Candidate"
                    )}
                </div>

                <div class="report-meta">
                    Call ID:
                    ${escapeHtml(report.call_id || "—")}
                </div>

                <div class="report-meta">
                    Status:
                    ${escapeHtml(report.call_status || "—")}
                </div>

            </div>
        `).join("");

    } catch (error) {
        console.error("Transcript reports error:", error);

        document.getElementById("transcriptReports").textContent =
            "Failed to load transcript reports.";
    }
}


// ------------------------------------------------------------
// Schedule Interview
// ------------------------------------------------------------

async function scheduleInterview() {

    const button = document.getElementById("scheduleButton");
    const statusBadge = document.getElementById("scheduleStatus");

    button.disabled = true;
    button.textContent = "Scheduling...";

    statusBadge.textContent = "PROCESSING";
    statusBadge.className = "badge";

    try {

        const body = {
            candidateId:
                "123e4567-e89b-12d3-a456-426614174000",

            jobId:
                "456e7890-e89b-12d3-a456-426614174001",

            interviewDate:
                "2026-08-15",

            interviewTime:
                "14:00:00",

            interviewerEmail:
                "recruiter@company.com"
        };

        const response = await apiRequest(
            "/api/interviews/schedule",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(body)
            }
        );

        statusBadge.textContent = "SUCCESS";
        statusBadge.className = "badge success-badge";

        const details = response.schedule_details || {};
        const invite = response.calendar_invite || {};

        document.getElementById("scheduledCandidate").textContent =
            "John Doe";

        document.getElementById("scheduledJob").textContent =
            "Senior Backend Engineer";

        document.getElementById("interviewDate").textContent =
            details.interview_date || body.interviewDate;

        document.getElementById("interviewTime").textContent =
            details.interview_time || body.interviewTime;

        document.getElementById("scheduleMessage").textContent =
            response.message || "Interview scheduled successfully.";

        document.getElementById("calendarSummary").textContent =
            invite.summary || "Calendar event created.";

        if (invite.google_meet_link) {

            const meetLink = document.getElementById("meetLink");

            meetLink.href = invite.google_meet_link;
            meetLink.style.display = "inline-block";
        }

    } catch (error) {

        console.error("Interview scheduling error:", error);

        statusBadge.textContent = "ERROR";
        statusBadge.className = "badge";

        document.getElementById("scheduleMessage").textContent =
            `Scheduling failed: ${error.message}`;

    } finally {

        button.disabled = false;
        button.textContent = "Schedule Interview";
    }
}


// ------------------------------------------------------------
// HTML escaping
// ------------------------------------------------------------

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ------------------------------------------------------------
// Load everything
// ------------------------------------------------------------

async function loadDashboard() {

    await Promise.all([
        loadHealth(),
        loadCandidates(),
        loadJobs(),
        loadCallAnalytics(),
        loadCandidateAnalytics(),
        loadAvailability(),
        loadTranscriptReports()
    ]);
}


// ------------------------------------------------------------
// Events
// ------------------------------------------------------------

document
    .getElementById("refreshButton")
    .addEventListener("click", loadDashboard);

document
    .getElementById("scheduleButton")
    .addEventListener("click", scheduleInterview);


// Initial load
loadDashboard();