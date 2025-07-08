-- Create zaeus_core schema
CREATE SCHEMA IF NOT EXISTS zaeus_core;

-- Move tables to zaeus_core schema
ALTER TABLE public.users SET SCHEMA zaeus_core;
ALTER TABLE public.profiles SET SCHEMA zaeus_core;
ALTER TABLE public.sessions SET SCHEMA zaeus_core;
ALTER TABLE public.password_resets SET SCHEMA zaeus_core;
ALTER TABLE public.conversations SET SCHEMA zaeus_core;
ALTER TABLE public.messages SET SCHEMA zaeus_core;
ALTER TABLE public.settings SET SCHEMA zaeus_core;

-- Create user_sessions table in zaeus_core schema
CREATE TABLE IF NOT EXISTS zaeus_core.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES zaeus_core.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_schema = 'zaeus_core'
                   AND table_name = 'users' 
                   AND column_name = 'is_active') 
    THEN
        ALTER TABLE zaeus_core.users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_schema = 'zaeus_core'
                   AND table_name = 'users' 
                   AND column_name = 'failed_login_attempts') 
    THEN
        ALTER TABLE zaeus_core.users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_schema = 'zaeus_core'
                   AND table_name = 'users' 
                   AND column_name = 'locked_until') 
    THEN
        ALTER TABLE zaeus_core.users ADD COLUMN locked_until TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_schema = 'zaeus_core'
                   AND table_name = 'users' 
                   AND column_name = 'last_login') 
    THEN
        ALTER TABLE zaeus_core.users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON zaeus_core.user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON zaeus_core.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON zaeus_core.user_sessions(expires_at);