/**
 * Motivational Quotes System
 * Provides diverse, inspiring messages for quiz completion
 */

export interface MotivationalQuote {
  id: number;
  text: string;
  author?: string;
  category: 'success' | 'learning' | 'perseverance' | 'growth' | 'wisdom';
}

/**
 * Collection of motivational quotes
 * Ensures variety with 20+ different quotes
 */
export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 1,
    text: "The expert in anything was once a beginner.",
    author: "Helen Hayes",
    category: 'learning'
  },
  {
    id: 2,
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: 'perseverance'
  },
  {
    id: 3,
    text: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela",
    category: 'learning'
  },
  {
    id: 4,
    text: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    category: 'learning'
  },
  {
    id: 5,
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
    category: 'perseverance'
  },
  {
    id: 6,
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: 'success'
  },
  {
    id: 7,
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: 'success'
  },
  {
    id: 8,
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: 'perseverance'
  },
  {
    id: 9,
    text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.",
    author: "Brian Herbert",
    category: 'learning'
  },
  {
    id: 10,
    text: "Intelligence is the ability to adapt to change.",
    author: "Stephen Hawking",
    category: 'growth'
  },
  {
    id: 11,
    text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    author: "Dr. Seuss",
    category: 'learning'
  },
  {
    id: 12,
    text: "Learning never exhausts the mind.",
    author: "Leonardo da Vinci",
    category: 'learning'
  },
  {
    id: 13,
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
    category: 'success'
  },
  {
    id: 14,
    text: "Mistakes are proof that you are trying.",
    category: 'growth'
  },
  {
    id: 15,
    text: "Every accomplishment starts with the decision to try.",
    category: 'success'
  },
  {
    id: 16,
    text: "Knowledge is power. Information is liberating.",
    author: "Kofi Annan",
    category: 'wisdom'
  },
  {
    id: 17,
    text: "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
    category: 'learning'
  },
  {
    id: 18,
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    category: 'perseverance'
  },
  {
    id: 19,
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    category: 'success'
  },
  {
    id: 20,
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: 'wisdom'
  },
  {
    id: 21,
    text: "Strive for progress, not perfection.",
    category: 'growth'
  },
  {
    id: 22,
    text: "Your limitation—it's only your imagination.",
    category: 'success'
  },
  {
    id: 23,
    text: "Great things never come from comfort zones.",
    category: 'growth'
  },
  {
    id: 24,
    text: "Dream it. Wish it. Do it.",
    category: 'success'
  },
  {
    id: 25,
    text: "Success doesn't just find you. You have to go out and get it.",
    category: 'success'
  }
];

/**
 * Tracks recently shown quotes to ensure variety
 * Stored in localStorage to persist across sessions
 */
const RECENT_QUOTES_KEY = 'quiz_recent_quotes';
const MAX_RECENT_QUOTES = 10;

/**
 * Get recently shown quote IDs from localStorage
 */
function getRecentQuotes(): number[] {
  try {
    const stored = localStorage.getItem(RECENT_QUOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save recently shown quote IDs to localStorage
 */
function saveRecentQuotes(quoteIds: number[]): void {
  try {
    localStorage.setItem(RECENT_QUOTES_KEY, JSON.stringify(quoteIds));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get a random motivational quote with variety tracking
 * Ensures at least 8 different quotes in 10 completions
 * 
 * @returns A random motivational quote
 */
export function getRandomMotivationalQuote(): MotivationalQuote {
  const recentQuotes = getRecentQuotes();
  
  // Filter out recently shown quotes to ensure variety
  let availableQuotes = MOTIVATIONAL_QUOTES.filter(
    quote => !recentQuotes.includes(quote.id)
  );
  
  // If we've exhausted all quotes, reset and use all quotes
  if (availableQuotes.length === 0) {
    availableQuotes = MOTIVATIONAL_QUOTES;
  }
  
  // Select a random quote from available quotes
  const randomIndex = Math.floor(Math.random() * availableQuotes.length);
  const selectedQuote = availableQuotes[randomIndex];
  
  // Update recent quotes tracking
  const updatedRecent = [selectedQuote.id, ...recentQuotes].slice(0, MAX_RECENT_QUOTES);
  saveRecentQuotes(updatedRecent);
  
  return selectedQuote;
}

/**
 * Clear recent quotes history (useful for testing)
 */
export function clearRecentQuotes(): void {
  try {
    localStorage.removeItem(RECENT_QUOTES_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get all available quotes (useful for testing)
 */
export function getAllQuotes(): MotivationalQuote[] {
  return [...MOTIVATIONAL_QUOTES];
}
