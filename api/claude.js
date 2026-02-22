export default async function handler(req, res) {
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
        res.status(500).json({ error: err.message });
    }
}
