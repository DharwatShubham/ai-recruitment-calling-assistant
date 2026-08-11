const store = require('../db/memoryStore');

// Helper to parse CSV string into candidate objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const candidates = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const entry = {};

        headers.forEach((header, index) => {
            const key = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            entry[key] = values[index] || '';
        });

        candidates.push({
            full_name: entry.full_name || entry.name || entry.candidate_name || 'Uploaded Candidate',
            phone_number: entry.phone_number || entry.phone || entry.mobile || '',
            email: entry.email || '',
            source: entry.source || 'csv_upload',
            ats_id: entry.ats_id || `CSV-${Date.now()}-${i}`
        });
    }

    return candidates;
}

const candidateController = {
    // GET /api/candidates
    getAllCandidates: (req, res) => {
        try {
            const candidates = store.getCandidates();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                count: candidates.length,
                data: candidates
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve candidates', details: error.message }));
        }
    },

    // GET /api/candidates/:id
    getCandidateById: (req, res, id) => {
        try {
            const candidate = store.getCandidateById(id);
            if (!candidate) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Candidate not found', candidate_id: id }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                data: candidate
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to retrieve candidate', details: error.message }));
        }
    },

    // POST /api/candidates/upload
    uploadCandidates: (req, res, bodyData) => {
        try {
            let addedCandidates = [];

            // Case 1: Body is JSON array
            if (Array.isArray(bodyData)) {
                addedCandidates = bodyData.map(item => store.addCandidate(item));
            } 
            // Case 2: Body is single candidate JSON
            else if (bodyData && typeof bodyData === 'object' && (bodyData.full_name || bodyData.name)) {
                addedCandidates = [store.addCandidate(bodyData)];
            }
            // Case 3: Raw CSV text payload
            else if (typeof bodyData === 'string' && bodyData.includes(',')) {
                const parsed = parseCSV(bodyData);
                addedCandidates = parsed.map(item => store.addCandidate(item));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid candidate data format. Expected CSV string or JSON candidate array.' }));
                return;
            }

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: `Successfully uploaded and registered ${addedCandidates.length} candidate(s)`,
                inserted_count: addedCandidates.length,
                data: addedCandidates
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Candidate upload failed', details: error.message }));
        }
    },

    // PATCH /api/candidates/:id
    updateCandidate: (req, res, id, updateFields) => {
        try {
            const updated = store.updateCandidate(id, updateFields);
            if (!updated) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Candidate not found for update', candidate_id: id }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: 'Candidate updated successfully',
                data: updated
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to update candidate', details: error.message }));
        }
    },

    // DELETE /api/candidates/:id (GDPR Compliance)
    deleteCandidate: (req, res, id) => {
        try {
            const deleted = store.deleteCandidate(id);
            if (!deleted) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Candidate not found for deletion', candidate_id: id }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: 'Candidate personal data purged successfully (GDPR compliance)',
                deleted_candidate_id: id
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to delete candidate', details: error.message }));
        }
    }
};

module.exports = candidateController;
