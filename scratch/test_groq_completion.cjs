const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function testGroqCompletion() {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';

  console.log(`Testing Groq completion with model "${model}"...`);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Say hello and confirm you are operational in one short sentence.' }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    console.log('HTTP Status:', res.status, res.statusText);
    const bodyText = await res.text();
    if (!res.ok) {
      console.log('Error Body:', bodyText);
      return;
    }
    const data = JSON.parse(bodyText);
    console.log('Generated content:');
    console.log(data.choices?.[0]?.message?.content);
    console.log('Usage:', data.usage);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testGroqCompletion();
