# Database Schema Standardization

## Current Issue
We have two sets of database schemas:
1. `/database/init/` - Uses schemas: `zaeus_core`, `zaeus_ai`, `zaeus_analytics`
2. `/backend/database/migrations/` - Uses default `public` schema

## Decision
We will use the schema-based approach from `/database/init/` as it provides better organization and security.

## Required Changes

### 1. Update API Service to use correct schema
All queries in `/backend/api-service/src/services/` need to reference `zaeus_core.users` instead of `public.users`
✅ Already fixed in userService.ts and authService.ts

### 2. Remove duplicate migration files
The files in `/backend/database/migrations/` are redundant and should be removed to avoid confusion.

### 3. Ensure Docker initialization
The init scripts in `/database/init/` are properly mounted in docker-compose.yml and run on container creation.

## Schema Structure
- `zaeus_core` - Users, authentication, profiles
- `zaeus_ai` - Conversations, agents, memory
- `zaeus_analytics` - Usage stats, metrics
- `zaeus_trading` - Market data, portfolios (future)