-- ============================================
-- Migration: Remove Authentication & Email Fields
-- ============================================
-- This migration removes all authentication and email-related fields
-- from the database while preserving user data.
-- 
-- IMPORTANT: Backup your database before running this migration!
-- ============================================

-- Remove authentication-related fields from users table
ALTER TABLE users 
  DROP COLUMN IF EXISTS emailVerified,
  DROP COLUMN IF EXISTS verificationToken,
  DROP COLUMN IF EXISTS verificationOtp,
  DROP COLUMN IF EXISTS verificationTokenExpiry,
  DROP COLUMN IF EXISTS resetToken,
  DROP COLUMN IF EXISTS resetOtp,
  DROP COLUMN IF EXISTS resetTokenExpiry;

-- Drop authentication-related indexes
DROP INDEX IF EXISTS users_verification_token_idx ON users;
DROP INDEX IF EXISTS users_reset_token_idx ON users;

-- Drop authentication and refresh tokens tables (if they exist)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS authentication;

-- Optional: Clean up any orphaned sessions or tokens in other tables
-- Add any additional cleanup queries here if needed

-- ============================================
-- Verification Queries (run these to verify cleanup)
-- ============================================
-- SHOW COLUMNS FROM users;
-- SHOW TABLES LIKE '%auth%';
-- SHOW TABLES LIKE '%token%';
