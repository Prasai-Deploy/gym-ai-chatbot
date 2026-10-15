const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function testGroqToolCalling() {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';

  console.log(`Testing Groq tool calling with model "${model}"...`);
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
          { role: 'user', content: 'What is my current fitness profile and weight?' }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_profile',
              description: 'Retrieve user fitness profile, goals, and measurements.',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 200
      })
    });

    console.log('HTTP Status:', res.status, res.statusText);
    const bodyText = await res.text();
    if (!res.ok) {
      console.log('Error Body:', bodyText);
      return;
    }
    const data = JSON.parse(bodyText);
    const msg = data.choices?.[0]?.message;
    console.log('Response Message:');
    console.log(JSON.stringify(msg, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testGroqToolCalling();
