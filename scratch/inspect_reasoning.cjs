const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function inspectMessage() {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are TRINETRA. Answer concisely in 2 sentences.' },
        { role: 'user', content: 'What is the best way to warm up before heavy squats?' }
      ],
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  const data = await res.json();
  console.log('Message:', JSON.stringify(data.choices?.[0]?.message, null, 2));
  console.log('Usage:', data.usage);
}

inspectMessage();
