CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge" varchar(50) NOT NULL,
	"description" text,
	"level" integer DEFAULT 1,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"source" varchar(50) DEFAULT 'chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" varchar(500) NOT NULL,
	"response" text NOT NULL,
	"metadata" json,
	"ttl" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"subject" varchar(255),
	"messages" json NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_history_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "code_snippets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"problem" text NOT NULL,
	"code" text NOT NULL,
	"language" varchar(50) NOT NULL,
	"explanation" text NOT NULL,
	"tags" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"subject" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_flashcards" (
	"deck_id" integer NOT NULL,
	"flashcard_id" integer NOT NULL,
	"position" integer DEFAULT 0,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_flashcards_deck_id_flashcard_id_pk" PRIMARY KEY("deck_id","flashcard_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"file_url" text,
	"file_type" varchar(20),
	"summary" text,
	"is_private" boolean DEFAULT true,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"email_type" varchar(50) NOT NULL,
	"recipient" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" varchar(255) NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"question_types" json NOT NULL,
	"question_count" integer NOT NULL,
	"title" varchar(255),
	"description" text,
	"favorited_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_quiz" UNIQUE("user_id","category","difficulty")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_decks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"document_id" integer,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"question_image" text,
	"answer_image" text,
	"tags" json,
	"category" varchar(255),
	"difficulty" varchar(10) DEFAULT 'medium',
	"repetition_interval" integer DEFAULT 1,
	"ease_factor" integer DEFAULT 250,
	"last_reviewed" timestamp,
	"next_review_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"document_id" integer,
	"question" text NOT NULL,
	"options" json NOT NULL,
	"correct_option" integer NOT NULL,
	"explanation" text,
	"difficulty" varchar(10) DEFAULT 'medium' NOT NULL,
	"category" varchar(255),
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"user_answer" text,
	"is_correct" boolean NOT NULL,
	"time_spent" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"question" text NOT NULL,
	"question_data" json NOT NULL,
	"correct_answer" json NOT NULL,
	"explanation" text,
	"category" varchar(255) NOT NULL,
	"difficulty" varchar(10) DEFAULT 'medium' NOT NULL,
	"tags" json,
	"hints" json,
	"is_public" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"average_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"time_spent" integer,
	"questions_data" json,
	"category" varchar(255),
	"difficulty" varchar(10),
	"completed" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_of_the_day_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"quiz_id" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"category" varchar(255) NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"time_spent" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"bonus_awarded" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qotd_user_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "quiz_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"category" varchar(255) NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"question_types" json NOT NULL,
	"total_questions" integer NOT NULL,
	"current_question_index" integer DEFAULT 0,
	"questions_data" json NOT NULL,
	"answers_data" json,
	"timed_mode" boolean DEFAULT false,
	"time_limit" integer,
	"time_spent" integer DEFAULT 0,
	"hints_used" integer DEFAULT 0,
	"completed" boolean DEFAULT false,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "saved_quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" varchar(255) NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"question_types" json NOT NULL,
	"question_count" integer NOT NULL,
	"title" varchar(255),
	"description" text,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shareable_quiz_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" varchar(100) NOT NULL,
	"creator_user_id" integer NOT NULL,
	"quiz_attempt_id" integer NOT NULL,
	"category" varchar(255) NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"questions_data" json NOT NULL,
	"total_questions" integer NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shareable_quiz_links_link_id_unique" UNIQUE("link_id")
);
--> statement-breakpoint
CREATE TABLE "shared_quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shareable_link_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"quiz_attempt_id" integer NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"time_spent" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_link" UNIQUE("shareable_link_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"schedule_data" json,
	"start_date" timestamp,
	"end_date" timestamp,
	"completed_percentage" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"study_plan_id" integer,
	"duration" integer NOT NULL,
	"subject" varchar(100),
	"notes" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"document_id" integer,
	"original_text" text NOT NULL,
	"summary" text NOT NULL,
	"key_points" json,
	"keywords" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_quiz_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_attempts" integer DEFAULT 0,
	"total_questions" integer DEFAULT 0,
	"correct_answers" integer DEFAULT 0,
	"incorrect_answers" integer DEFAULT 0,
	"average_score" integer DEFAULT 0,
	"average_accuracy" integer DEFAULT 0,
	"total_time_spent" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_quiz_date" timestamp,
	"category_stats" json,
	"difficulty_stats" json,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_quiz_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_study_time" integer DEFAULT 0,
	"quizzes_completed" integer DEFAULT 0,
	"average_score" integer DEFAULT 0,
	"documents_uploaded" integer DEFAULT 0,
	"flashcards_created" integer DEFAULT 0,
	"flashcards_reviewed" integer DEFAULT 0,
	"correct_flashcards" integer DEFAULT 0,
	"incorrect_flashcards" integer DEFAULT 0,
	"code_snippets_generated" integer DEFAULT 0,
	"questions_asked" integer DEFAULT 0,
	"streak_days" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"xp_points" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" text NOT NULL,
	"email" varchar(100) NOT NULL,
	"full_name" varchar(100),
	"profile_picture" text,
	"preferred_language" varchar(10) DEFAULT 'en',
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"verification_otp" varchar(6),
	"verification_token_expiry" timestamp,
	"reset_token" text,
	"reset_otp" varchar(6),
	"reset_token_expiry" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"last_failed_login" timestamp,
	"account_locked_until" timestamp,
	"pending_email" varchar(100),
	"email_change_token" text,
	"email_change_otp" varchar(6),
	"email_change_token_expiry" timestamp,
	"backup_email" varchar(100),
	"security_question_1" varchar(255),
	"security_answer_1" text,
	"security_question_2" varchar(255),
	"security_answer_2" text,
	"total_points" integer DEFAULT 0 NOT NULL,
	"media_retention_days" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_snippets" ADD CONSTRAINT "code_snippets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_flashcards" ADD CONSTRAINT "deck_flashcards_deck_id_flashcard_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_flashcards" ADD CONSTRAINT "deck_flashcards_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_quizzes" ADD CONSTRAINT "favorite_quizzes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcqs" ADD CONSTRAINT "mcqs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcqs" ADD CONSTRAINT "mcqs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_of_the_day_completions" ADD CONSTRAINT "quiz_of_the_day_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_quizzes" ADD CONSTRAINT "saved_quizzes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_logs" ADD CONSTRAINT "security_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shareable_quiz_links" ADD CONSTRAINT "shareable_quiz_links_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shareable_quiz_links" ADD CONSTRAINT "shareable_quiz_links_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_quiz_attempts" ADD CONSTRAINT "shared_quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_quiz_attempts" ADD CONSTRAINT "shared_quiz_attempts_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_quiz_attempts" ADD CONSTRAINT "sqa_link_fk" FOREIGN KEY ("shareable_link_id") REFERENCES "public"."shareable_quiz_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_study_plan_id_study_plans_id_fk" FOREIGN KEY ("study_plan_id") REFERENCES "public"."study_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quiz_stats" ADD CONSTRAINT "user_quiz_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ach_user_id_idx" ON "achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ach_badge_idx" ON "achievements" USING btree ("badge");--> statement-breakpoint
CREATE UNIQUE INDEX "ach_user_badge_uidx" ON "achievements" USING btree ("user_id","badge");--> statement-breakpoint
CREATE INDEX "attachment_user_id_idx" ON "attachments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attachment_source_idx" ON "attachments" USING btree ("source");--> statement-breakpoint
CREATE INDEX "attachment_created_at_idx" ON "attachments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cr_query_idx" ON "cached_responses" USING btree ("query");--> statement-breakpoint
CREATE INDEX "cr_ttl_idx" ON "cached_responses" USING btree ("ttl");--> statement-breakpoint
CREATE INDEX "chat_user_id_idx" ON "chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_session_id_idx" ON "chat_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_last_updated_idx" ON "chat_history" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "cs_user_id_idx" ON "code_snippets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cs_language_idx" ON "code_snippets" USING btree ("language");--> statement-breakpoint
CREATE INDEX "cs_title_idx" ON "code_snippets" USING btree ("title");--> statement-breakpoint
CREATE INDEX "contact_user_id_idx" ON "contact_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_status_idx" ON "contact_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contact_created_at_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "df_deck_id_idx" ON "deck_flashcards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "df_flashcard_id_idx" ON "deck_flashcards" USING btree ("flashcard_id");--> statement-breakpoint
CREATE INDEX "doc_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doc_title_idx" ON "documents" USING btree ("title");--> statement-breakpoint
CREATE INDEX "doc_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_logs_user_id_idx" ON "email_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_logs_email_type_idx" ON "email_logs" USING btree ("email_type");--> statement-breakpoint
CREATE INDEX "email_logs_sent_at_idx" ON "email_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "fq_user_id_idx" ON "favorite_quizzes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fq_category_idx" ON "favorite_quizzes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fq_favorited_at_idx" ON "favorite_quizzes" USING btree ("favorited_at");--> statement-breakpoint
CREATE INDEX "fb_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fb_message_id_idx" ON "feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "fb_type_idx" ON "feedback" USING btree ("type");--> statement-breakpoint
CREATE INDEX "fd_user_id_idx" ON "flashcard_decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fc_user_id_idx" ON "flashcards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fc_doc_id_idx" ON "flashcards" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "fc_review_date_idx" ON "flashcards" USING btree ("next_review_date");--> statement-breakpoint
CREATE INDEX "fc_category_idx" ON "flashcards" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "mcq_user_id_idx" ON "mcqs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcq_doc_id_idx" ON "mcqs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "mcq_difficulty_idx" ON "mcqs" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "mcq_category_idx" ON "mcqs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "qst_quiz_id_idx" ON "question_attempts" USING btree ("quiz_attempt_id");--> statement-breakpoint
CREATE INDEX "qst_question_id_idx" ON "question_attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "q_user_id_idx" ON "questions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "q_type_idx" ON "questions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "q_category_idx" ON "questions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "q_difficulty_idx" ON "questions" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "q_created_at_idx" ON "questions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qa_user_id_idx" ON "quiz_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "qa_created_at_idx" ON "quiz_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qotd_user_id_idx" ON "quiz_of_the_day_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "qotd_date_idx" ON "quiz_of_the_day_completions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "qotd_quiz_id_idx" ON "quiz_of_the_day_completions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "qs_user_id_idx" ON "quiz_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "qs_session_id_idx" ON "quiz_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "qs_category_idx" ON "quiz_sessions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "qs_difficulty_idx" ON "quiz_sessions" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "qs_created_at_idx" ON "quiz_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sq_user_id_idx" ON "saved_quizzes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sq_category_idx" ON "saved_quizzes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sq_saved_at_idx" ON "saved_quizzes" USING btree ("saved_at");--> statement-breakpoint
CREATE INDEX "security_audit_logs_user_id_idx" ON "security_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audit_logs_action_idx" ON "security_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "security_audit_logs_created_at_idx" ON "security_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sql_link_id_idx" ON "shareable_quiz_links" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "sql_creator_idx" ON "shareable_quiz_links" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "sql_expires_at_idx" ON "shareable_quiz_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sqa_link_idx" ON "shared_quiz_attempts" USING btree ("shareable_link_id");--> statement-breakpoint
CREATE INDEX "sqa_user_idx" ON "shared_quiz_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sp_user_id_idx" ON "study_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sp_status_idx" ON "study_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sp_date_range_idx" ON "study_plans" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "ss_user_id_idx" ON "study_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ss_plan_id_idx" ON "study_sessions" USING btree ("study_plan_id");--> statement-breakpoint
CREATE INDEX "ss_date_idx" ON "study_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "sum_user_id_idx" ON "summaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sum_doc_id_idx" ON "summaries" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "uqs_user_id_idx" ON "user_quiz_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "us_user_id_idx" ON "user_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "us_level_idx" ON "user_stats" USING btree ("level");--> statement-breakpoint
CREATE INDEX "us_streak_idx" ON "user_stats" USING btree ("streak_days");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_verification_token_idx" ON "users" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "users_reset_token_idx" ON "users" USING btree ("reset_token");