import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// ── /api/claude — Groq note extraction ──────────────────────────────────────
app.post('/api/claude', async (req, res) => {
    try {
        const { messages } = req.body;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
            }),
        });

        const data = await response.json();
        const text = data.choices[0].message.content;
        res.json({ content: [{ text }] });

    } catch (err) {
        console.error('Groq error:', err);
        res.status(500).json({ error: err.message });
    }
});

async function fetchYouTubeTranscript(videoId) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    // Step 1: fetch watch page to get caption track language codes
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers });
    if (!pageRes.ok) throw new Error(`YouTube page returned ${pageRes.status}`);

    const html = await pageRes.text();

    const playerResponse = extractJSON(html, 'ytInitialPlayerResponse');
    if (!playerResponse) throw new Error('Could not extract player data. Video may be unavailable.');

    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No captions available for this video.');
    }

    // Step 2: pick English or first available
    const track = captionTracks.find(t => t.languageCode === 'en')
        || captionTracks.find(t => t.languageCode?.startsWith('en'))
        || captionTracks[0];

    // console.log('Using track:', track.languageCode);

    // Step 3: use public timedtext API directly (no auth needed)
    const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${track.languageCode}&fmt=json3`;
    // console.log('Fetching captions from:', captionUrl);

    const captionRes = await fetch(captionUrl, { headers });
    if (!captionRes.ok) throw new Error(`Caption fetch returned ${captionRes.status}`);

    const body = await captionRes.text();
    if (!body || body.length === 0) throw new Error('Caption response is empty. Try a different video.');

    let captionData;
    try {
        captionData = JSON.parse(body);
    } catch {
        throw new Error('Could not parse caption data.');
    }

    if (!captionData.events || captionData.events.length === 0) {
        throw new Error('No caption events found in response.');
    }

    const fullText = captionData.events
        .filter(e => e.segs)
        .flatMap(e => e.segs.map(s => s.utf8 || ''))
        .join(' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return fullText;
}

// ── /api/youtube — Transcript fetch + Groq extraction ───────────────────────
app.post('/api/youtube', async (req, res) => {
    try {
        const { url, focus } = req.body;
        if (!url) return res.status(400).json({ error: 'No URL provided' });

        // Extract video ID
        const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (!videoIdMatch) return res.status(400).json({ error: 'Invalid YouTube URL' });
        const videoId = videoIdMatch[1];


        let fullText;
        try {
            fullText = await fetchYouTubeTranscript(videoId);
        } catch (e) {
            console.error('Transcript error:', e.message);
            return res.status(400).json({ error: e.message });
        }

        if (!fullText) return res.status(400).json({ error: 'Transcript is empty for this video.' });

        // Send to Groq
        const prompt = `You are a smart note-taking assistant. Analyze this YouTube video transcript and extract structured notes.

Transcript:
---
${fullText.slice(0, 12000)}
---

Focus areas: ${focus || 'key insights'}

Return ONLY valid JSON in this exact shape:
{
  "title": "Inferred video title or topic",
  "summary": "A concise 2-3 sentence summary of the video",
  "keyPoints": [
    { "text": "Key insight or point", "type": "insight" }
  ]
}

Rules:
- Extract 5-10 key points depending on content length
- Each point should be standalone and informative
- Vary type between: insight, action, data, quote, definition
- Be specific and concrete
- Return ONLY the JSON, no markdown fences, no explanation`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        const groqData = await groqRes.json();
        const text = groqData.choices[0].message.content;
        res.json({ content: [{ text }] });

    } catch (err) {
        console.error('YouTube route error:', err);
        res.status(500).json({ error: err.message });
    }
});

function extractJSON(html, varName) {
    const start = html.indexOf(`${varName} = `);
    if (start === -1) return null;

    const jsonStart = html.indexOf('{', start);
    if (jsonStart === -1) return null;

    let depth = 0;
    let i = jsonStart;
    while (i < html.length) {
        const ch = html[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                try {
                    return JSON.parse(html.slice(jsonStart, i + 1));
                } catch {
                    return null;
                }
            }
        }
        i++;
    }
    return null;
}

app.listen(3001, () => console.log('✅ API proxy running on http://localhost:3001'));