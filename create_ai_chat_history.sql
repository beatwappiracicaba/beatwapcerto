-- Create table for AI chat history
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own AI messages"
    ON public.ai_chat_messages
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI messages"
    ON public.ai_chat_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON public.ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON public.ai_chat_messages(created_at);
