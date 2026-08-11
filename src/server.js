const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const candidateController = require('./controllers/candidateController');
const jobController = require('./controllers/jobController');
const callController = require('./controllers/callController');
const interviewController = require('./controllers/interviewController');
const analyticsController = require('./controllers/analyticsController');

// ============================================================
// Environment Loader
// ============================================================

function loadEnv() {
    const envPath = path.join(__dirname, '../.env');

    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');

        content.split('\n').forEach(line => {
            const trimmed = line.trim();

            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');

                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
}

loadEnv();


// ============================================================
// Server Configuration
// ============================================================

const PORT = process.env.PORT || 3000;


// ============================================================
// Helper: Collect Request Body
// ============================================================

function getRequestBody(req) {
    return new Promise((resolve, reject) => {

        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {

            if (!body) {
                return resolve(null);
            }

            try {
                resolve(JSON.parse(body));
            } catch (err) {
                resolve(body);
            }
        });

        req.on('error', err => {
            reject(err);
        });
    });
}


// ============================================================
// Helper: Serve Static File
// ============================================================

function serveStaticFile(res, filePath, contentType) {

    if (!fs.existsSync(filePath)) {

        res.writeHead(404, {
            'Content-Type': 'text/plain'
        });

        res.end('File not found');

        return false;
    }

    try {

        const file = fs.readFileSync(filePath);

        res.writeHead(200, {
            'Content-Type': contentType
        });

        res.end(file);

        return true;

    } catch (error) {

        console.error('Static file error:', error);

        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        res.end('Unable to load file');

        return false;
    }
}


// ============================================================
// Create HTTP Server
// ============================================================

const server = http.createServer(async (req, res) => {

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    res.setHeader('Access-Control-Allow-Origin', '*');

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );


    // --------------------------------------------------------
    // Handle OPTIONS / CORS Preflight
    // --------------------------------------------------------

    if (req.method === 'OPTIONS') {

        res.writeHead(204);

        res.end();

        return;
    }


    // --------------------------------------------------------
    // Parse URL
    // --------------------------------------------------------

    const parsedUrl = url.parse(req.url, true);

    const pathname = parsedUrl.pathname;

    const pathParts = pathname
        .split('/')
        .filter(Boolean);


    try {

        // ====================================================
        // 0. FRONTEND
        // ====================================================

        // GET /
        if (req.method === 'GET' && pathname === '/') {

            const indexPath = path.join(
                __dirname,
                '../public/index.html'
            );

            serveStaticFile(
                res,
                indexPath,
                'text/html; charset=utf-8'
            );

            return;
        }


        // ====================================================
        // Serve CSS
        // ====================================================

        // GET /style.css
        if (req.method === 'GET' && pathname === '/style.css') {

            const cssPath = path.join(
                __dirname,
                '../public/style.css'
            );

            serveStaticFile(
                res,
                cssPath,
                'text/css; charset=utf-8'
            );

            return;
        }


        // ====================================================
        // Serve JavaScript
        // ====================================================

        // GET /app.js
        if (req.method === 'GET' && pathname === '/app.js') {

            const jsPath = path.join(
                __dirname,
                '../public/app.js'
            );

            serveStaticFile(
                res,
                jsPath,
                'application/javascript; charset=utf-8'
            );

            return;
        }


        // ====================================================
        // 1. HEALTH CHECK
        // ====================================================

        if (
            req.method === 'GET' &&
            (
                pathname === '/health' ||
                pathname === '/api/health'
            )
        ) {

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(
                JSON.stringify({
                    status: 'online',
                    service: 'AI Recruitment Calling Assistant',
                    timestamp: new Date().toISOString(),
                    environment:
                        process.env.NODE_ENV || 'development'
                })
            );

            return;
        }


        // ====================================================
        // 2. CANDIDATE MANAGEMENT
        // ====================================================

        if (
            pathParts[0] === 'api' &&
            pathParts[1] === 'candidates'
        ) {

            // POST /api/candidates/upload
            if (
                req.method === 'POST' &&
                pathParts[2] === 'upload'
            ) {

                const body = await getRequestBody(req);

                return candidateController.uploadCandidates(
                    req,
                    res,
                    body
                );
            }


            const candidateId = pathParts[2];


            // GET /api/candidates
            if (
                req.method === 'GET' &&
                !candidateId
            ) {

                return candidateController.getAllCandidates(
                    req,
                    res
                );
            }


            // GET /api/candidates/:id
            if (
                req.method === 'GET' &&
                candidateId
            ) {

                return candidateController.getCandidateById(
                    req,
                    res,
                    candidateId
                );
            }


            // PATCH /api/candidates/:id
            if (
                req.method === 'PATCH' &&
                candidateId
            ) {

                const body = await getRequestBody(req);

                return candidateController.updateCandidate(
                    req,
                    res,
                    candidateId,
                    body
                );
            }


            // DELETE /api/candidates/:id
            if (
                req.method === 'DELETE' &&
                candidateId
            ) {

                return candidateController.deleteCandidate(
                    req,
                    res,
                    candidateId
                );
            }
        }


        // ====================================================
        // 3. JOB MANAGEMENT
        // ====================================================

        if (
            pathParts[0] === 'api' &&
            pathParts[1] === 'jobs'
        ) {

            // POST /api/jobs/sync
            if (
                req.method === 'POST' &&
                pathParts[2] === 'sync'
            ) {

                const body = await getRequestBody(req);

                return jobController.syncJobs(
                    req,
                    res,
                    body
                );
            }


            const jobId = pathParts[2];


            // GET /api/jobs
            if (
                req.method === 'GET' &&
                !jobId
            ) {

                return jobController.getAllJobs(
                    req,
                    res
                );
            }


            // GET /api/jobs/:id
            if (
                req.method === 'GET' &&
                jobId
            ) {

                return jobController.getJobById(
                    req,
                    res,
                    jobId
                );
            }
        }


        // ====================================================
        // 4. CALL MANAGEMENT
        // ====================================================

        if (
            pathParts[0] === 'api' &&
            pathParts[1] === 'calls'
        ) {

            // POST /api/calls/initiate
            if (
                req.method === 'POST' &&
                pathParts[2] === 'initiate'
            ) {

                const body = await getRequestBody(req);

                return callController.initiateCall(
                    req,
                    res,
                    body
                );
            }


            // POST /api/calls/webhook
            if (
                req.method === 'POST' &&
                pathParts[2] === 'webhook'
            ) {

                const body = await getRequestBody(req);

                return callController.handleWebhook(
                    req,
                    res,
                    body
                );
            }


            const callId = pathParts[2];

            const action = pathParts[3];


            // GET /api/calls/:id/status
            if (
                req.method === 'GET' &&
                callId &&
                action === 'status'
            ) {

                return callController.getCallStatus(
                    req,
                    res,
                    callId
                );
            }


            // GET /api/calls/:id/recording
            if (
                req.method === 'GET' &&
                callId &&
                action === 'recording'
            ) {

                return callController.getCallRecording(
                    req,
                    res,
                    callId
                );
            }


            // GET /api/calls/:id/transcript
            if (
                req.method === 'GET' &&
                callId &&
                action === 'transcript'
            ) {

                return callController.getCallTranscript(
                    req,
                    res,
                    callId
                );
            }
        }


        // ====================================================
        // 5. INTERVIEW SCHEDULING
        // ====================================================

        if (
            pathParts[0] === 'api' &&
            pathParts[1] === 'interviews'
        ) {

            // GET /api/interviews/availability
            if (
                req.method === 'GET' &&
                pathParts[2] === 'availability'
            ) {

                return interviewController.getAvailability(
                    req,
                    res,
                    parsedUrl.query
                );
            }


            // POST /api/interviews/schedule
            if (
                req.method === 'POST' &&
                pathParts[2] === 'schedule'
            ) {

                const body = await getRequestBody(req);

                return interviewController.scheduleInterview(
                    req,
                    res,
                    body
                );
            }


            const interviewId = pathParts[2];


            // PATCH /api/interviews/:id
            if (
                req.method === 'PATCH' &&
                interviewId
            ) {

                const body = await getRequestBody(req);

                return interviewController.updateInterview(
                    req,
                    res,
                    interviewId,
                    body
                );
            }


            // DELETE /api/interviews/:id
            if (
                req.method === 'DELETE' &&
                interviewId
            ) {

                return interviewController.cancelInterview(
                    req,
                    res,
                    interviewId
                );
            }
        }


        // ====================================================
        // 6. ANALYTICS & REPORTING
        // ====================================================

        if (
            pathParts[0] === 'api' &&
            (
                pathParts[1] === 'analytics' ||
                pathParts[1] === 'reports'
            )
        ) {

            // GET /api/analytics/calls
            if (
                req.method === 'GET' &&
                pathParts[1] === 'analytics' &&
                pathParts[2] === 'calls'
            ) {

                return analyticsController.getCallAnalytics(
                    req,
                    res
                );
            }


            // GET /api/analytics/candidates
            if (
                req.method === 'GET' &&
                pathParts[1] === 'analytics' &&
                pathParts[2] === 'candidates'
            ) {

                return analyticsController.getCandidateAnalytics(
                    req,
                    res
                );
            }


            // GET /api/reports/transcripts
            if (
                req.method === 'GET' &&
                pathParts[1] === 'reports' &&
                pathParts[2] === 'transcripts'
            ) {

                return analyticsController.getTranscriptReports(
                    req,
                    res
                );
            }
        }


        // ====================================================
        // 7. 404 FALLBACK
        // ====================================================

        res.writeHead(404, {
            'Content-Type': 'application/json'
        });

        res.end(
            JSON.stringify({
                error: 'Endpoint Not Found',
                path: pathname
            })
        );


    } catch (error) {

        // ====================================================
        // GLOBAL ERROR HANDLER
        // ====================================================

        console.error(
            'Server error handling request:',
            error
        );

        res.writeHead(500, {
            'Content-Type': 'application/json'
        });

        res.end(
            JSON.stringify({
                error: 'Internal Server Error',
                details: error.message
            })
        );
    }
});


// ============================================================
// Start Server
// ============================================================

server.listen(PORT, () => {

    console.log(
        `AI Recruitment Calling Assistant server running on port ${PORT}`
    );

    console.log(
        `Frontend available at: http://localhost:${PORT}/`
    );

    console.log(
        `Health check available at: http://localhost:${PORT}/health`
    );
});