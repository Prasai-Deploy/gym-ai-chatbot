// Test script

async function testChat() {
  try {
    // 1. Authenticate as demo user
    const loginRes = await fetch('http://localhost:3000/api/auth/demo', { method: 'POST' });
    const cookie = loginRes.headers.get('set-cookie');
    console.log("Logged in:", loginRes.status);
    
    // 2. Send chat message
    const chatRes = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie || ''
      },
      body: JSON.stringify({ message: "generate a very simple workout plan for today" })
    });
    
    const data = await chatRes.json();
    console.log("Chat response updates:", data.updates);
    console.log("Chat response text:", data.text.substring(0, 100) + "...");
    
  } catch(e) {
    console.error(e);
  }
}

testChat();
