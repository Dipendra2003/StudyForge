-- Migration: Add Quiz of the Day tables and user points tracking
-- Date: 2026-03-14
-- Description: Adds user_points, quiz_of_the_day_completions tables and totalPoints field to users

-- Add totalPoints field to users table
ALTER TABLE users 
ADD COLUMN total_points INT NOT NULL DEFAULT 0 AFTER account_locked_until;

-- Create user_points table for tracking all point transactions
CREATE TABLE IF NOT EXISTS user_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  points INT NOT NULL,
  source VARCHAR(50) NOT NULL COMMENT 'Source of points: qotd, quiz, achievement, streak',
  amount INT NOT NULL,
  description TEXT,
  metadata JSON COMMENT 'Additional context like quizId, achievementId, etc.',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX up_user_id_idx (user_id),
  INDEX up_source_idx (source),
  INDEX up_created_at_idx (created_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quiz_of_the_day_completions table for tracking QOTD completions
CREATE TABLE IF NOT EXISTS quiz_of_the_day_completions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quiz_id VARCHAR(50) NOT NULL COMMENT 'Format: qotd-YYYY-MM-DD',
  date TIMESTAMP NOT NULL COMMENT 'Date of the quiz (normalized to 00:00:00)',
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  time_spent INT NOT NULL COMMENT 'Time spent in seconds',
  accuracy INT NOT NULL COMMENT 'Accuracy percentage',
  bonus_awarded INT NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX qotd_user_id_idx (user_id),
  INDEX qotd_date_idx (date),
  INDEX qotd_quiz_id_idx (quiz_id),
  UNIQUE KEY qotd_user_date_unique (user_id, date),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE user_points COMMENT = 'Tracks all point transactions for gamification';
ALTER TABLE quiz_of_the_day_completions COMMENT = 'Tracks Quiz of the Day completions with bonus points';
