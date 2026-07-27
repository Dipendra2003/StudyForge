/**
 * Helper functions for consistent feedback across the application
 * This file provides utilities for showing loading states, errors, and success messages
 */

import { showErrorToast, showSuccessToast } from './errorHandler';

// Success feedback helpers
export const successFeedback = {
  // Document operations
  documentCreated: () => showSuccessToast('Document created successfully'),
  documentUpdated: () => showSuccessToast('Document updated successfully'),
  documentDeleted: () => showSuccessToast('Document deleted successfully'),
  
  // Summary operations
  summaryGenerated: () => showSuccessToast('Summary generated successfully', {
    title: 'AI Generation Complete',
    duration: 3000
  }),
  
  // Flashcard operations
  flashcardCreated: () => showSuccessToast('Flashcard created successfully'),
  flashcardUpdated: () => showSuccessToast('Flashcard updated successfully'),
  flashcardDeleted: () => showSuccessToast('Flashcard deleted successfully'),
  flashcardsGenerated: (count: number) => showSuccessToast(
    `Generated ${count} flashcard${count !== 1 ? 's' : ''} successfully`,
    { title: 'AI Generation Complete' }
  ),
  
  // Quiz operations
  quizCompleted: (score: number, total: number) => showSuccessToast(
    `You scored ${score} out of ${total}!`,
    { title: 'Quiz Complete', duration: 3000 }
  ),
  quizGenerated: () => showSuccessToast('Quiz questions generated successfully', {
    title: 'AI Generation Complete'
  }),
  
  // Code generation
  codeGenerated: () => showSuccessToast('Code generated successfully', {
    title: 'AI Generation Complete'
  }),
  
  // Study plan
  studyPlanCreated: () => showSuccessToast('Study plan created successfully'),
  studyPlanGenerated: () => showSuccessToast('Study plan generated successfully', {
    title: 'AI Generation Complete'
  }),
  studyPlanTaskCompleted: () => showSuccessToast('Task marked as complete', {
    duration: 2000
  }),
  
  // Chat
  messageSent: () => {}, // Silent success for chat
  
  // Auth
  loginSuccess: () => showSuccessToast('Welcome back!', { title: 'Login Successful' }),
  logoutSuccess: () => showSuccessToast('You have been logged out', { title: 'Logout Successful' }),
  registrationSuccess: () => showSuccessToast('Account created successfully', { 
    title: 'Welcome to Jadoo!',
    duration: 3000
  }),
  passwordResetSent: () => showSuccessToast('Password reset link sent to your email', {
    title: 'Check Your Email',
    duration: 3000
  }),
  passwordResetSuccess: () => showSuccessToast('Password reset successfully', {
    title: 'Password Updated'
  }),
  
  // Profile
  profileUpdated: () => showSuccessToast('Profile updated successfully'),
  
  // Generic
  saved: () => showSuccessToast('Changes saved successfully'),
  copied: () => showSuccessToast('Copied to clipboard', { duration: 2000 }),
};

// Error feedback helpers with retry support
export const errorFeedback = {
  // Document operations
  documentCreateFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Create Document', onRetry }),
  documentUpdateFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Update Document', onRetry }),
  documentDeleteFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Delete Document', onRetry }),
  documentLoadFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Load Documents', onRetry }),
  
  // Summary operations
  summaryGenerationFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Generate Summary', onRetry }),
  
  // Flashcard operations
  flashcardCreateFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Create Flashcard', onRetry }),
  flashcardUpdateFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Update Flashcard', onRetry }),
  flashcardDeleteFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Delete Flashcard', onRetry }),
  flashcardLoadFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Load Flashcards', onRetry }),
  flashcardGenerationFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Generate Flashcards', onRetry }),
  
  // Quiz operations
  quizLoadFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Load Quiz', onRetry }),
  quizGenerationFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Generate Quiz', onRetry }),
  quizSubmitFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Submit Quiz', onRetry }),
  
  // Code generation
  codeGenerationFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Generate Code', onRetry }),
  
  // Study plan
  studyPlanCreateFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Create Study Plan', onRetry }),
  studyPlanLoadFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Load Study Plans', onRetry }),
  studyPlanGenerationFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Generate Study Plan', onRetry }),
  
  // Chat
  chatMessageFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Send Message', onRetry }),
  chatLoadFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Load Chat History', onRetry }),
  
  // Auth
  loginFailed: (error: unknown) => 
    showErrorToast(error, { title: 'Login Failed' }),
  registrationFailed: (error: unknown) => 
    showErrorToast(error, { title: 'Registration Failed' }),
  logoutFailed: (error: unknown) => 
    showErrorToast(error, { title: 'Logout Failed' }),
  passwordResetFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Password Reset Failed', onRetry }),
  
  // Profile
  profileUpdateFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Update Profile', onRetry }),
  
  // Generic
  loadFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Load Data', onRetry }),
  saveFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Save', onRetry }),
  deleteFailed: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Failed to Delete', onRetry }),
  networkError: (error: unknown, onRetry?: () => void) => 
    showErrorToast(error, { title: 'Network Error', onRetry }),
};

// Loading state text helpers
export const loadingText = {
  // AI operations
  generatingSummary: 'AI is analyzing your document...',
  generatingFlashcards: 'AI is creating flashcards...',
  generatingQuiz: 'AI is preparing quiz questions...',
  generatingCode: 'AI is writing code...',
  generatingStudyPlan: 'AI is creating your study plan...',
  generatingResponse: 'AI is thinking...',
  
  // Data operations
  loading: 'Loading...',
  saving: 'Saving...',
  deleting: 'Deleting...',
  updating: 'Updating...',
  creating: 'Creating...',
  
  // Specific operations
  loadingDocuments: 'Loading documents...',
  loadingFlashcards: 'Loading flashcards...',
  loadingQuizzes: 'Loading quizzes...',
  loadingStudyPlans: 'Loading study plans...',
  loadingChatHistory: 'Loading chat history...',
  
  // Auth
  loggingIn: 'Logging in...',
  loggingOut: 'Logging out...',
  registering: 'Creating your account...',
  resettingPassword: 'Resetting password...',
};

// Estimated time for AI operations (in seconds)
export const estimatedTime = {
  summary: 8,
  flashcard: 5,
  quiz: 10,
  code: 7,
  studyPlan: 12,
  chat: 5,
};
