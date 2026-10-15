const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function testQwen() {
  const apiKey = process.env.GROQ_API_KEY;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: 'You are TRINETRA. Answer concisely in 2 sentences.' },
        { role: 'user', content: 'What is the best way to warm up before heavy squats?' }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  const data = await res.json();
  console.log('Qwen Message:', JSON.stringify(data.choices?.[0]?.message, null, 2));
  console.log('Qwen Usage:', data.usage);
}

testQwen();
