fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "generate today's workout plan" })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
