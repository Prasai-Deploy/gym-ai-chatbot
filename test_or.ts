import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

async function testOpenRouter() {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || "z-ai/glm-4.5-air:free",
            messages: [{ role: "user", content: "hello" }]
        })
    });

    const text = await response.text();
    fs.writeFileSync("output.json", text, "utf8");
}

testOpenRouter();
