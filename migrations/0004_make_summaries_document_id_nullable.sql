-- Make document_id nullable in summaries table
-- This allows summaries to be created without being linked to a document
ALTER TABLE `summaries` MODIFY COLUMN `document_id` int;
