import { TOKEN } from "./constants";



export function YouTubeComingSoon() {
    return (
        <div style={{
            border: `1.5px solid ${TOKEN.border}`,
            borderRadius: 4,
            background: TOKEN.card,
            padding: "2.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "1.25rem",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Subtle red tint top stripe */}
            <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${TOKEN.youtube}66, transparent)`,
            }} />

            {/* YouTube play icon */}
            <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "#fff0f0",
                border: `1.5px solid ${TOKEN.youtube}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="5" fill={TOKEN.youtube} />
                    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="white" />
                </svg>
            </div>

            {/* Badge */}
            <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: TOKEN.cream,
                border: `1px solid ${TOKEN.border}`,
                borderRadius: 20,
                padding: "0.25rem 0.75rem",
                fontFamily: TOKEN.font.mono,
                fontSize: "0.58rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: TOKEN.muted,
            }}>
                <span style={{
                    display: "inline-block",
                    width: 6, height: 6,
                    borderRadius: "50%",
                    background: TOKEN.youtube,
                }} />
                Coming Soon
            </div>

            {/* Heading */}
            <div style={{
                fontFamily: TOKEN.font.display,
                fontSize: "1.35rem",
                fontWeight: 700,
                color: TOKEN.ink,
                lineHeight: 1.25,
            }}>
                YouTube Notes
            </div>

            {/* Description */}
            <div style={{
                fontFamily: TOKEN.font.body,
                fontSize: "0.83rem",
                color: TOKEN.muted,
                lineHeight: 1.7,
                maxWidth: 280,
            }}>
                Paste a YouTube link and get instant notes from the video transcript. We're working on it.
            </div>

            {/* Divider */}
            <div style={{
                width: 32,
                height: 1.5,
                background: TOKEN.accent,
                borderRadius: 2,
                opacity: 0.5,
            }} />

            {/* Feature list */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                width: "100%",
                maxWidth: 280,
            }}>
                {[
                    "Auto transcript extraction",
                    "Key insights & summaries",
                    "Timestamp references",
                    "Export to PDF & DOCX",
                ].map((feat) => (
                    <div key={feat} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        fontFamily: TOKEN.font.mono,
                        fontSize: "0.68rem",
                        color: TOKEN.muted,
                        letterSpacing: "0.02em",
                    }}>
                        <span style={{
                            display: "inline-block",
                            width: 16, height: 1.5,
                            background: TOKEN.border,
                            flexShrink: 0,
                        }} />
                        {feat}
                    </div>
                ))}
            </div>
        </div>
    );
}