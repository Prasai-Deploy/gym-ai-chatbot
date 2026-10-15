const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function testCompleteGroqToolLoop() {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b';

  console.log(`[Test] 1. Initial request to model "${model}" with tools...`);
  const initialMessages = [
    { role: 'system', content: 'You are TRINETRA, an AI fitness coach. Use the tools provided.' },
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

  const res1 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: initialMessages,
      tools: tools,
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 300
    })
  });

  if (!res1.ok) {
    console.error('Initial request failed:', res1.status, await res1.text());
    return;
  }

  const data1 = await res1.json();
  const choice1 = data1.choices[0];
  console.log('Initial choice finish_reason:', choice1.finish_reason);
  console.log('Initial message:', choice1.message);

  if (choice1.finish_reason === 'tool_calls' && choice1.message.tool_calls) {
    const toolCall = choice1.message.tool_calls[0];
    console.log(`[Test] 2. Mocking tool execution for "${toolCall.function.name}"...`);

    const mockToolOutput = toolCall.function.name === 'get_profile'
      ? { age: 28, weightKg: 75, goal: 'Hypertrophy', experienceLevel: 'Intermediate' }
      : { workoutName: 'Upper Body Power', exercisesCount: 5 };

    const followupMessages = [
      ...initialMessages,
      choice1.message,
      {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(mockToolOutput)
      }
    ];

    console.log('[Test] 3. Sending tool result back to Groq...');
    const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: followupMessages,
        tools: tools,
        temperature: 0.2,
        max_tokens: 300
      })
    });

    if (!res2.ok) {
      console.error('Follow-up request failed:', res2.status, await res2.text());
      return;
    }

    const data2 = await res2.json();
    console.log('Follow-up choice finish_reason:', data2.choices[0].finish_reason);
    console.log('Follow-up generated answer:');
    console.log(data2.choices[0].message.content);
    console.log('Total tokens across both calls:', (data1.usage?.total_tokens || 0) + (data2.usage?.total_tokens || 0));
  }
}

testCompleteGroqToolLoop();
