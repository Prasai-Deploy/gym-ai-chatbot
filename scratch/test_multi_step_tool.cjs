const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function testMultiStepToolLoop() {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';

  console.log('[Test Multi-Step] Starting multi-step tool conversation...');
  let messages = [
    { role: 'system', content: 'You are TRINETRA, an AI coach. Always synthesize tool outputs to answer the user.' },
    { role: 'user', content: 'What is my current fitness profile and workout today?' }
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_profile',
        description: 'Retrieve user fitness profile, goals, and measurements.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_today_workout',
        description: 'Retrieve the scheduled workout plan for today.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    }
  ];

  for (let turn = 1; turn <= 4; turn++) {
    console.log(`\n--- Turn ${turn} ---`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        tools: tools,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const data = await res.json();
    const choice = data.choices[0];
    console.log(`Finish reason: ${choice.finish_reason}`);

    if (choice.finish_reason === 'stop') {
      console.log('Final Assistant Message:');
      console.log(choice.message.content);
      break;
    } else if (choice.finish_reason === 'tool_calls') {
      messages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        console.log(`Executing tool: ${tc.function.name}`);
        const toolResult = tc.function.name === 'get_profile'
          ? { weightKg: 78, goal: 'Hypertrophy', level: 'Intermediate' }
          : { workoutName: 'Leg Day Blast', exercises: ['Squats', 'Leg Press', 'Calf Raises'] };
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult)
        });
      }
    }
  }
}

testMultiStepToolLoop();
