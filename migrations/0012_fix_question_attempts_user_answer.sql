-- Migration: Fix question_attempts.user_answer column type
-- Change from INT to TEXT to support string answers like 'a', 'b', 'true', 'false', etc.

ALTER TABLE `question_attempts` 
MODIFY COLUMN `user_answer` TEXT;
