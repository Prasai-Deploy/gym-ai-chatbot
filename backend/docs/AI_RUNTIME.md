# STRIVA v2: AI Runtime & Tool Orchestration

## Overview
The AI Runtime acts as the gateway between the LLM and the STRIVA Application Services. It ensures that the LLM is tightly constrained, safe, and only acts through deterministic, validated APIs.

## Key Components

### 1. Conversation Manager
Manages the `ai_conversations` and `ai_messages` tables. It maintains the user's history and handles token budgeting before passing the payload to the LLM.

### 2. Prompt Builder
Injects the `UnifiedAIContextDTO` (built by the Intelligence domain) directly into the System Prompt. This ensures the LLM always has the latest user state (progress, nutrition, recovery) without ever querying a database itself.

### 3. Tool Registry & Tool Runtime
The LLM cannot execute raw SQL or internal logic. It can only emit a "Tool Call" JSON payload.
1. The **Tool Runtime** intercepts this payload.
2. It looks up the requested tool in the **Tool Registry**.
3. It validates the LLM's arguments against the tool's strict Zod `inputSchema`.
4. If valid, the Tool executes logic against STRIVA's existing Application Services.
5. The Tool Runtime formats the output and returns it to the LLM.

### 4. Safety Guard
The `SafetyGuard` inspects incoming user prompts for Prompt Injection attacks ("ignore previous instructions") and filters outbound responses for unsafe medical advice or hallucinatory statements.

## Creating a New Tool
To expose a new capability to the LLM:
1. Extend `BaseTool`.
2. Define a strict Zod `inputSchema`.
3. Implement `executeImpl(input, userId)`.
4. Register it in `ToolRegistry`.
