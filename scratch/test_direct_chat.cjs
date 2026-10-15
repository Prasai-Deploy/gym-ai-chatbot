const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function testGroqDirectChat() {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';

  console.log(`[Test Direct Chat] Asking model "${model}" a simple question...`);
  const messages = [
    { role: 'system', content: 'You are TRINETRA, an elite AI fitness coach for STRIVA.' },
    { role: 'user', content: 'What is the best way to warm up before heavy squats?' }
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 300
    })
  });

  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Direct response:');
  console.log(data.choices?.[0]?.message?.content);
  console.log('Usage:', data.usage);
}

testGroqDirectChat();
