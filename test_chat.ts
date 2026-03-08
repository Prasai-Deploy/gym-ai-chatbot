import dotenv from "dotenv";
dotenv.config();

async function testChat() {
    try {
        const res = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Hey coach! Could you tell me about the best back workout?",
                history: []
            })
        });
        const data = await res.json();
        console.log("Chatbot Response:");
        console.log(data.text || data);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testChat();
