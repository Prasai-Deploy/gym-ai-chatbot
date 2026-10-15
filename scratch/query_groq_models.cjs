const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function queryGroqModels() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log('No GROQ_API_KEY found');
    return;
  }
  console.log('Querying Groq models API...');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log('Status:', res.status, res.statusText);
    if (!res.ok) {
      const errText = await res.text();
      console.log('Error body:', errText);
      return;
    }
    const data = await res.json();
    console.log(`Total models available: ${data.data?.length}`);
    const activeModels = data.data?.map(m => ({ id: m.id, active: m.active, context_window: m.context_window }));
    console.log('Available models:', activeModels);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

queryGroqModels();
