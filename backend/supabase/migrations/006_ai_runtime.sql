-- ==========================================
-- SPRINT 4G: AI RUNTIME & ORCHESTRATION MIGRATION
-- ==========================================

-- 1. AI CONVERSATIONS
-- Tracks a continuous dialogue session with the AI.
CREATE TABLE public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, ARCHIVED
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. AI MESSAGES
-- Appends history of chat (User, Assistant, Tool payloads)
CREATE TABLE public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT,
    tool_calls JSONB, -- Array of tools the assistant wants to call
    tool_call_id TEXT, -- ID if this is a tool response
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. AI TOOL EXECUTIONS
-- Audit log for tracking every tool invoked by the LLM
CREATE TABLE public.ai_tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input_payload JSONB,
    output_payload JSONB,
    status TEXT NOT NULL, -- 'SUCCESS', 'ERROR'
    error_message TEXT,
    latency_ms INT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
CREATE TRIGGER update_ai_conversations_modtime BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_executions ENABLE ROW LEVEL SECURITY;

-- Security Policies (Members manage their own data)
CREATE POLICY "Members manage own conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members manage own messages" ON public.ai_messages FOR ALL USING (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
);
CREATE POLICY "Members read own tool executions" ON public.ai_tool_executions FOR SELECT USING (auth.uid() = user_id);
-- Writing tool executions happens via Service Role in backend
