import { useState, useRef, useCallback, useEffect } from "react";



// ─── Inline styles / design tokens ───────────────────────────────────────────
const TOKEN = {
    paper: "#F7F3EC",
    card: "#FDFAF5",
    cream: "#EDE8DC",
    ink: "#141210",
    muted: "#8C8274",
    border: "#D8D0C4",
    accent: "#C13B0C",
    green: "#1A5C3A",
    highlight: "#F0C93A",
    font: {
        display: "'Playfair Display', Georgia, serif",
        mono: "'DM Mono', 'Courier New', monospace",
        body: "'DM Sans', sans-serif",
    },
};

const POINT_COLORS = ["#C9A227", "#1A5C3A", "#B03838"];

// ─── Tiny reusable pieces ─────────────────────────────────────────────────────
const Label = ({ children, style }) => (
    <div
        style={{
            fontFamily: TOKEN.font.mono,
            fontSize: "0.6rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: TOKEN.muted,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            ...style,
        }}
    >
        <span
            style={{
                display: "inline-block",
                width: 16,
                height: 1.5,
                background: TOKEN.accent,
                flexShrink: 0,
            }}
        />
        {children}
    </div>
);

const Toast = ({ msg }) => (
    <div
        style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            background: TOKEN.ink,
            color: TOKEN.paper,
            fontFamily: TOKEN.font.mono,
            fontSize: "0.75rem",
            padding: "0.85rem 1.4rem",
            borderRadius: 4,
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
            animation: "toastIn 0.3s ease",
        }}
    >
        {msg}
    </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function DistillApp() {
    // Input state
    const [tab, setTab] = useState("url");
    const [url, setUrl] = useState("");
    const [pastedText, setPastedText] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [focusChips, setFocusChips] = useState(["Key insights", "Action items"]);
    const fileRef = useRef();

    // Output state
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState(null); // { title, summary, keyPoints[], source }
    const [toast, setToast] = useState(null);

    // Editing state (lifted so we can export)
    const [editTitle, setEditTitle] = useState("");
    const [editSummary, setEditSummary] = useState("");
    const [editPoints, setEditPoints] = useState([]); // [{id, text, colorIdx}]

    const nextId = useRef(1);

    useEffect(() => {
        if (notes) {
            setEditTitle(notes.title || "");
            setEditSummary(notes.summary || "");
            setEditPoints(
                (notes.keyPoints || []).map((p, i) => ({
                    id: nextId.current++,
                    text: typeof p === "string" ? p : p.text,
                    colorIdx: i % POINT_COLORS.length,
                }))
            );
        }
    }, [notes]);

    // ── helpers ──
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const toggleChip = (chip) =>
        setFocusChips((prev) =>
            prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
        );

    const setFile = (f) => setSelectedFile(f);
    const removeFile = () => {
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    // ── extract ──
    const extract = async () => {
        let content = "";
        let sourceLabel = "";

        if (tab === "url") {
            if (!url.trim()) return showToast("Please enter a URL");
            content = `Extract structured notes from the content at this URL: ${url.trim()}. Analyze as if you've read the article there.`;
            sourceLabel = url.trim();
        } else if (tab === "file") {
            if (!selectedFile) return showToast("Please select a file");
            content = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = (e) => res(e.target.result);
                r.onerror = rej;
                r.readAsText(selectedFile);
            });
            sourceLabel = selectedFile.name;
        } else {
            if (!pastedText.trim()) return showToast("Please paste some text");
            content = pastedText.trim();
            sourceLabel = "Pasted text";
        }

        const focus = focusChips.length ? focusChips.join(", ") : "key insights";
        setLoading(true);
        setNotes(null);

        const prompt = `You are a smart note-taking assistant. Analyze the following content and extract structured notes.

Content:
---
${content}
---

Focus areas: ${focus}

Return ONLY valid JSON in this exact shape:
{
  "title": "Article or content title (infer if not present)",
  "summary": "A concise 2-3 sentence summary of the entire content",
  "keyPoints": [
    { "text": "Key insight or point", "type": "insight" }
  ]
}

Rules:
- Extract 5-10 key points depending on content length
- Each point should be a standalone, actionable or informative sentence
- Vary type between: insight, action, data, quote, definition
- Be specific and concrete
- Return ONLY the JSON object, no markdown fences, no explanation`;

        try {
            // const res = await fetch("https://api.anthropic.com/v1/messages", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({
            //         model: "claude-sonnet-4-20250514",
            //         max_tokens: 1000,
            //         messages: [{ role: "user", content: prompt }],
            //     }),
            // });
            const res = await fetch("/api/claude", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000 }),
            });
            const data = await res.json();
            const raw = (data.content || []).map((b) => b.text || "").join("");
            const clean = raw.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(clean);
            setNotes({ ...parsed, source: sourceLabel });
        } catch (err) {
            showToast("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── point CRUD ──
    const updatePoint = (id, text) =>
        setEditPoints((prev) => prev.map((p) => (p.id === id ? { ...p, text } : p)));
    const deletePoint = (id) =>
        setEditPoints((prev) => prev.filter((p) => p.id !== id));
    const addPoint = () =>
        setEditPoints((prev) => [
            ...prev,
            {
                id: nextId.current++,
                text: "New note — click to edit",
                colorIdx: prev.length % POINT_COLORS.length,
            },
        ]);

    // ── export PDF ──
    const exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const M = 50;
        const W = doc.internal.pageSize.getWidth() - M * 2;
        let y = M;

        const write = (text, size, bold, color = [20, 18, 16]) => {
            doc.setFontSize(size);
            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setTextColor(...color);
            const lines = doc.splitTextToSize(String(text), W);
            lines.forEach((line) => {
                if (y > 780) { doc.addPage(); y = M; }
                doc.text(line, M, y);
                y += size * 1.5;
            });
            y += 4;
        };

        write("DISTILL — NOTES EXPORT", 8, false, [140, 128, 112]);
        if (notes?.source) write(notes.source, 8, false, [140, 128, 112]);
        y += 10;
        write(editTitle, 22, true);
        y += 4;
        write("SUMMARY", 8, true, [193, 59, 12]);
        write(editSummary, 10, false);
        y += 10;
        write("KEY POINTS", 8, true, [193, 59, 12]);
        editPoints.forEach(({ text }) => {
            if (y > 760) { doc.addPage(); y = M; }
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(193, 59, 12);
            doc.text("▸", M, y);
            doc.setFont("helvetica", "normal"); doc.setTextColor(20, 18, 16);
            const lines = doc.splitTextToSize(text, W - 14);
            lines.forEach((line, i) => {
                if (y > 780) { doc.addPage(); y = M; }
                doc.setFontSize(10);
                doc.text(line, M + 14, y);
                if (i < lines.length - 1) y += 15;
            });
            y += 20;
        });

        doc.save("distill-notes.pdf");
        showToast("PDF exported!");
    };

    // ── export DOCX ──
    const exportDocx = () => {
        const date = new Date().toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
        });
        const esc = (s) =>
            String(s)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body{font-family:Calibri,sans-serif;margin:2.5cm;color:#141210}
h1{font-size:22pt;margin-bottom:6pt}
.meta{font-size:9pt;color:#8C8274;margin-bottom:18pt}
.lbl{font-size:8pt;color:#C13B0C;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-top:18pt;margin-bottom:6pt}
.summary{font-size:11pt;line-height:1.6;padding:12pt;border-left:3pt solid #C13B0C;background:#fdf6f0}
ul{margin-top:0}li{font-size:11pt;line-height:1.6;margin-bottom:8pt}
.footer{font-size:8pt;color:#aaa;margin-top:30pt;border-top:1pt solid #ddd;padding-top:8pt}
</style></head><body>
<div class="meta">Distill Notes · ${esc(notes?.source || "")} · ${date}</div>
<h1>${esc(editTitle)}</h1>
<div class="lbl">Summary</div>
<div class="summary">${esc(editSummary)}</div>
<div class="lbl">Key Points</div>
<ul>${editPoints.map((p) => `<li>${esc(p.text)}</li>`).join("")}</ul>
<div class="footer">Exported with Distill — AI Notes Extractor</div>
</body></html>`;

        const blob = new Blob([html], { type: "application/msword" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "distill-notes.doc";
        a.click();
        showToast("DOCX exported!");
    };

    const hasNotes = !!notes && !loading;

    // ─── Render ──────────────────────────────────────────────────────────────────
    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${TOKEN.paper}; min-height: 100vh; }
        [contenteditable]:focus { outline: 2px solid ${TOKEN.accent}22; border-radius: 2px; }
        textarea:focus, input:focus { outline: none; border-color: ${TOKEN.ink} !important; }
        @keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        .point-item:hover .point-del { opacity: 1 !important; }
        .export-btn:hover:not(:disabled) { background: ${TOKEN.ink} !important; color: ${TOKEN.paper} !important; border-color: ${TOKEN.ink} !important; }
        .tab-btn:not(.active):hover { background: ${TOKEN.cream}; }
        .extract-btn:hover:not(:disabled) { background: #A3330A !important; transform: translateY(-1px); }
        .upload-zone:hover { border-color: ${TOKEN.accent} !important; background: #fdf4ef !important; }
        .add-btn:hover { border-color: ${TOKEN.green} !important; color: ${TOKEN.green} !important; }
      `}</style>

            {/* HEADER */}
            <header style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "1.4rem 3rem", borderBottom: `1.5px solid ${TOKEN.border}`,
                background: TOKEN.paper, position: "sticky", top: 0, zIndex: 50,
            }}>
                <div style={{ fontFamily: TOKEN.font.display, fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                    Dis<span style={{ color: TOKEN.accent }}>till</span>
                </div>
                <div style={{
                    fontFamily: TOKEN.font.mono, fontSize: "0.62rem", letterSpacing: "0.15em",
                    textTransform: "uppercase", color: TOKEN.muted,
                    border: `1px solid ${TOKEN.border}`, padding: "0.3rem 0.75rem", borderRadius: 2,
                }}>
                    AI Notes Extractor
                </div>
            </header>

            {/* TWO-COLUMN LAYOUT */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 73px)" }}>

                {/* ── LEFT: INPUT ── */}
                <div style={{
                    padding: "2.5rem 3rem", borderRight: `1.5px solid ${TOKEN.border}`,
                    display: "flex", flexDirection: "column", gap: "1.75rem",
                    background: TOKEN.paper,
                }}>
                    <div>
                        <Label>Source</Label>
                        <div style={{ fontFamily: TOKEN.font.display, fontSize: "1.75rem", fontWeight: 700, marginTop: "0.3rem" }}>
                            Add your content
                        </div>
                    </div>

                    {/* TABS */}
                    <div style={{ display: "flex", border: `1.5px solid ${TOKEN.border}`, borderRadius: 4, overflow: "hidden" }}>
                        {[["url", "🔗 URL"], ["file", "📄 File"], ["text", "✏️ Text"]].map(([key, label]) => (
                            <button
                                key={key}
                                className="tab-btn"
                                onClick={() => setTab(key)}
                                style={{
                                    flex: 1, padding: "0.7rem 1rem", border: "none", cursor: "pointer",
                                    fontFamily: TOKEN.font.mono, fontSize: "0.7rem", letterSpacing: "0.06em",
                                    textTransform: "uppercase", transition: "all 0.2s",
                                    borderRight: `1.5px solid ${TOKEN.border}`,
                                    background: tab === key ? TOKEN.ink : "transparent",
                                    color: tab === key ? TOKEN.paper : TOKEN.muted,
                                }}
                            >{label}</button>
                        ))}
                    </div>

                    {/* URL */}
                    {tab === "url" && (
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article..."
                            style={{
                                width: "100%", padding: "1rem 1.25rem",
                                border: `1.5px solid ${TOKEN.border}`, borderRadius: 4,
                                background: TOKEN.card, fontFamily: TOKEN.font.mono,
                                fontSize: "0.85rem", color: TOKEN.ink,
                            }}
                        />
                    )}

                    {/* FILE */}
                    {tab === "file" && (
                        <>
                            {!selectedFile ? (
                                <div
                                    className="upload-zone"
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={(e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0]); }}
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${dragOver ? TOKEN.accent : TOKEN.border}`,
                                        borderRadius: 4, padding: "3rem 2rem", textAlign: "center",
                                        cursor: "pointer", background: TOKEN.card, transition: "all 0.2s",
                                    }}
                                >
                                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
                                    <div style={{ fontFamily: TOKEN.font.display, fontSize: "1.05rem", marginBottom: "0.4rem" }}>
                                        Drop your file here
                                    </div>
                                    <div style={{ fontFamily: TOKEN.font.mono, fontSize: "0.7rem", color: TOKEN.muted }}>
                                        PDF or TXT supported
                                    </div>
                                    <input ref={fileRef} type="file" accept=".pdf,.txt,.md"
                                        style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
                                </div>
                            ) : (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "0.75rem",
                                    padding: "0.85rem 1rem", border: `1.5px solid ${TOKEN.border}`,
                                    borderRadius: 4, background: TOKEN.card,
                                    fontFamily: TOKEN.font.mono, fontSize: "0.78rem",
                                }}>
                                    <span>📄</span>
                                    <span style={{ fontWeight: 500, flex: 1 }}>{selectedFile.name}</span>
                                    <span onClick={removeFile} style={{ cursor: "pointer", color: TOKEN.accent }}>✕ Remove</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* TEXT */}
                    {tab === "text" && (
                        <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste your article, report, or any content here..."
                            style={{
                                width: "100%", minHeight: 200, padding: "1.1rem 1.25rem",
                                border: `1.5px solid ${TOKEN.border}`, borderRadius: 4,
                                background: TOKEN.card, fontFamily: TOKEN.font.body,
                                fontSize: "0.88rem", lineHeight: 1.7, color: TOKEN.ink, resize: "vertical",
                            }}
                        />
                    )}

                    {/* FOCUS CHIPS */}
                    <div>
                        <Label style={{ marginBottom: "0.75rem" }}>Focus on</Label>
                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                            {["Key insights", "Action items", "Statistics & data", "Quotes", "Definitions"].map((chip) => (
                                <button
                                    key={chip}
                                    onClick={() => toggleChip(chip)}
                                    style={{
                                        padding: "0.4rem 0.9rem",
                                        border: `1.5px solid ${focusChips.includes(chip) ? TOKEN.ink : TOKEN.border}`,
                                        borderRadius: 20, cursor: "pointer", transition: "all 0.2s",
                                        fontFamily: TOKEN.font.mono, fontSize: "0.68rem", letterSpacing: "0.04em",
                                        background: focusChips.includes(chip) ? TOKEN.ink : "transparent",
                                        color: focusChips.includes(chip) ? TOKEN.paper : TOKEN.muted,
                                    }}
                                >{chip}</button>
                            ))}
                        </div>
                    </div>

                    {/* EXTRACT BUTTON */}
                    <button
                        className="extract-btn"
                        onClick={extract}
                        disabled={loading}
                        style={{
                            padding: "1.05rem 2.5rem", background: TOKEN.accent, color: "white",
                            border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer",
                            fontFamily: TOKEN.font.display, fontSize: "1.05rem", fontWeight: 700,
                            alignSelf: "flex-start", transition: "all 0.2s",
                            opacity: loading ? 0.6 : 1,
                            position: "relative", overflow: "hidden",
                        }}
                    >
                        {loading ? "Extracting…" : "Extract Notes →"}
                        {loading && (
                            <span style={{
                                position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
                                background: "rgba(255,255,255,0.45)",
                                animation: "shimmer 1.4s infinite",
                                backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                                backgroundSize: "200% 100%",
                            }} />
                        )}
                    </button>
                </div>

                {/* ── RIGHT: OUTPUT ── */}
                <div style={{
                    padding: "2.5rem 3rem", background: TOKEN.card,
                    display: "flex", flexDirection: "column", gap: "1.75rem",
                }}>
                    {/* Output header */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                        <div>
                            <Label>Output</Label>
                            <div style={{ fontFamily: TOKEN.font.display, fontSize: "1.75rem", fontWeight: 700, marginTop: "0.3rem" }}>
                                Your notes
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                            {[["↓ PDF", exportPDF], ["↓ DOCX", exportDocx]].map(([label, fn]) => (
                                <button
                                    key={label}
                                    className="export-btn"
                                    onClick={fn}
                                    disabled={!hasNotes}
                                    style={{
                                        padding: "0.5rem 1rem", border: `1.5px solid ${TOKEN.border}`,
                                        borderRadius: 4, background: TOKEN.paper, cursor: hasNotes ? "pointer" : "not-allowed",
                                        fontFamily: TOKEN.font.mono, fontSize: "0.68rem", letterSpacing: "0.08em",
                                        textTransform: "uppercase", color: TOKEN.ink, transition: "all 0.2s",
                                        opacity: hasNotes ? 1 : 0.4,
                                    }}
                                >{label}</button>
                            ))}
                        </div>
                    </div>

                    {/* EMPTY STATE */}
                    {!loading && !notes && (
                        <div style={{
                            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", textAlign: "center", gap: "1rem",
                            opacity: 0.45, padding: "4rem 2rem",
                        }}>
                            <div style={{ fontSize: "3.5rem" }}>🌿</div>
                            <div style={{ fontFamily: TOKEN.font.display, fontSize: "1.25rem" }}>Nothing extracted yet</div>
                            <div style={{ fontSize: "0.83rem", color: TOKEN.muted, maxWidth: 260, lineHeight: 1.7 }}>
                                Add a URL, upload a file, or paste text on the left to get started.
                            </div>
                        </div>
                    )}

                    {/* SKELETON */}
                    {loading && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {[["70%", 22], ["40%", 12], ["100%", 80], ["100%", 52], ["100%", 52], ["80%", 52]].map(([w, h], i) => (
                                <div key={i} style={{
                                    width: w, height: h, borderRadius: 3,
                                    background: `linear-gradient(90deg, ${TOKEN.cream} 0%, ${TOKEN.border} 50%, ${TOKEN.cream} 100%)`,
                                    backgroundSize: "200% 100%",
                                    animation: `shimmer 1.5s infinite`,
                                    animationDelay: `${i * 0.07}s`,
                                }} />
                            ))}
                        </div>
                    )}

                    {/* NOTES */}
                    {hasNotes && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", animation: "slideUp 0.35s ease" }}>

                            {/* Source tag */}
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                                fontFamily: TOKEN.font.mono, fontSize: "0.65rem", color: TOKEN.muted,
                                background: TOKEN.cream, padding: "0.3rem 0.65rem", borderRadius: 2,
                                maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                                📎 {notes.source}
                            </div>

                            {/* Title */}
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => setEditTitle(e.target.textContent)}
                                style={{
                                    fontFamily: TOKEN.font.display, fontSize: "1.45rem", fontWeight: 700,
                                    lineHeight: 1.3, paddingBottom: "1rem", borderBottom: `1.5px solid ${TOKEN.border}`,
                                }}
                            >{editTitle}</div>

                            {/* Summary */}
                            <div style={{ padding: "1.1rem 1.25rem", borderLeft: `3px solid ${TOKEN.accent}`, background: "#fdf4ef", borderRadius: "0 4px 4px 0" }}>
                                <div style={{ fontFamily: TOKEN.font.mono, fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: TOKEN.accent, marginBottom: "0.5rem" }}>
                                    Summary
                                </div>
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => setEditSummary(e.target.textContent)}
                                    style={{ fontSize: "0.88rem", lineHeight: 1.7 }}
                                >{editSummary}</div>
                            </div>

                            {/* Key points */}
                            <div>
                                <Label style={{ marginBottom: "0.75rem" }}>Key Points</Label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                    {editPoints.map((pt, i) => (
                                        <div
                                            key={pt.id}
                                            className="point-item"
                                            style={{
                                                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                                                padding: "0.85rem 1rem", border: `1.5px solid ${TOKEN.border}`,
                                                borderRadius: 4, background: "white", transition: "border-color 0.2s, box-shadow 0.2s",
                                                animation: `slideUp 0.3s ease ${i * 0.05}s both`,
                                                position: "relative",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = TOKEN.highlight;
                                                e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = TOKEN.border;
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            <div style={{
                                                width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                                                background: POINT_COLORS[pt.colorIdx],
                                            }} />
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => updatePoint(pt.id, e.target.textContent)}
                                                style={{ flex: 1, fontSize: "0.87rem", lineHeight: 1.65, minWidth: 0 }}
                                            >{pt.text}</div>
                                            <button
                                                className="point-del"
                                                onClick={() => deletePoint(pt.id)}
                                                style={{
                                                    width: 24, height: 24, borderRadius: 3, border: `1px solid ${TOKEN.border}`,
                                                    background: TOKEN.paper, cursor: "pointer", fontSize: "0.65rem",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    opacity: 0, transition: "opacity 0.15s, background 0.15s",
                                                    flexShrink: 0,
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = "#B03838"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#B03838"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = TOKEN.paper; e.currentTarget.style.color = TOKEN.ink; e.currentTarget.style.borderColor = TOKEN.border; }}
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add note */}
                                <button
                                    className="add-btn"
                                    onClick={addPoint}
                                    style={{
                                        marginTop: "0.65rem", width: "100%", padding: "0.7rem 1rem",
                                        border: `1.5px dashed ${TOKEN.border}`, borderRadius: 4, background: "transparent",
                                        fontFamily: TOKEN.font.mono, fontSize: "0.7rem", letterSpacing: "0.06em",
                                        color: TOKEN.muted, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                                    }}
                                >+ Add a note</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && <Toast msg={toast} />}

            {/* jsPDF CDN for export */}
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />
        </>
    );
}