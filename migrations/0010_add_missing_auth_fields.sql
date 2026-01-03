-- ============================================
-- Migration: Add Missing Authentication Fields and Tables
-- ============================================
-- This migration adds the remaining authentication fields
-- and creates the email_logs and security_audit_logs tables
-- ============================================

-- Add missing security tracking fields to users table
-- Check if columns exist before adding them
SET @dbname = DATABASE();
SET @tablename = 'users';

-- Add failed_login_attempts if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'failed_login_attempts');
SET @query = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0', 
  'SELECT "Column failed_login_attempts already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add last_failed_login if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'last_failed_login');
SET @query = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP NULL', 
  'SELECT "Column last_failed_login already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add account_locked_until if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'account_locked_until');
SET @query = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP NULL', 
  'SELECT "Column account_locked_until already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  email_type VARCHAR(50) NOT NULL,
  recipient VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX email_logs_user_id_idx (user_id),
  INDEX email_logs_email_type_idx (email_type),
  INDEX email_logs_sent_at_idx (sent_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX security_audit_logs_user_id_idx (user_id),
  INDEX security_audit_logs_action_idx (action),
  INDEX security_audit_logs_created_at_idx (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update refresh_tokens table to match schema
-- Drop the revoked_at column if it exists and doesn't match our schema
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'refresh_tokens' AND COLUMN_NAME = 'revoked_at');
SET @query = IF(@col_exists > 0, 
  'ALTER TABLE refresh_tokens DROP COLUMN revoked_at', 
  'SELECT "Column revoked_at does not exist" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the refresh_tokens table has the correct structure
-- The table should have: id, user_id, token, expires_at, created_at, user_agent, ip_address
