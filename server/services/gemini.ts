import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import crypto from 'crypto';
import { AIError, AIErrorCode } from '../utils/ai-errors';

/**
 * Chat message interface compatible with Gemini API
 */
export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

/**
 * Generation options for AI content
 */
export interface GenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Flashcard data structure
 */
export interface FlashcardData {
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

/**
 * Multiple choice question data structure
 */
export interface MCQData {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Code generation data structure
 */
export interface CodeData {
  code: string;
  explanation: string;
  language: string;
  complexity?: string;
}

/**
 * Study plan data structure
 */
export interface StudyPlanData {
  title: string;
  description: string;
  scheduleData: Array<{
    day: number;
    title: string;
    tasks: string[];
    resources?: string[];
  }>;
}

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  service: string;
  action: string;
  userId?: number;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Cache manager for storing AI responses with TTL
 */
class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Generate a cache key from prompt and options
   */
  private generateKey(prompt: string, model: string, temperature: number): string {
    const data = `${prompt}:${model}:${temperature}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get(prompt: string, model: string, temperature: number): string | null {
    const key = this.generateKey(prompt, model, temperature);
    const entry = this.cache.get(key);

    if (!entry) {
      this.log('INFO', 'cache_miss', { key });
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.log('INFO', 'cache_expired', { key });
      return null;
    }

    this.log('INFO', 'cache_hit', { key });
    return entry.value;
  }

  /**
   * Set a value in the cache with TTL
   */
  set(prompt: string, model: string, temperature: number, value: string, ttl?: number): void {
    const key = this.generateKey(prompt, model, temperature);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, { value, expiresAt });
    this.log('INFO', 'cache_set', { key, ttl: ttl || this.defaultTTL });
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(prompt: string, model: string, temperature: number): void {
    const key = this.generateKey(prompt, model, temperature);
    this.cache.delete(key);
    this.log('INFO', 'cache_invalidate', { key });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.log('INFO', 'cache_clear', {});
  }

  /**
   * Log cache operations
   */
  private log(level: string, action: string, metadata: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level as 'ERROR' | 'WARN' | 'INFO' | 'DEBUG',
      service: 'cache',
      action,
      metadata,
    };
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Retry handler with exponential backoff
 */
class RetryHandler {
  /**
   * Execute an operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    userId?: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Log the error
        this.logError(error as Error, attempt, maxRetries, userId);

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if it's a rate limit error - fail fast, don't retry
        if (this.isRateLimitError(error as Error)) {
          throw this.getUserFriendlyError(error as Error);
        }

        // Check if error is retryable
        if (!this.isRetryable(error as Error)) {
          throw this.getUserFriendlyError(error as Error);
        }

        // Calculate delay with exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    throw this.getUserFriendlyError(lastError!);
  }

  /**
   * Check if error is a rate limit error (429) - should NOT retry
   */
  private isRateLimitError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('429') || 
           errorMessage.includes('too many requests') ||
           errorMessage.includes('quota exceeded') ||
           errorMessage.includes('rate limit');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // DON'T retry on rate limit - fail fast
    if (this.isRateLimitError(error)) {
      return false;
    }
    
    // Retry on network and timeout errors only
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('503')
    ) {
      return true;
    }

    // Don't retry on invalid API key, invalid request, etc.
    return false;
  }

  /**
   * Convert technical errors to user-friendly AIError messages
   */
  private getUserFriendlyError(error: Error): AIError {
    return AIError.fromError(error);
  }

  /**
   * Log error details
   */
  private logError(error: Error, attempt: number, maxRetries: number, userId?: number): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: 'retry-handler',
      action: 'retry_attempt',
      userId,
      metadata: {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
      },
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    console.error(JSON.stringify(logEntry));
  }
}

/**
 * Gemini AI Service for handling AI interactions
 */
export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private cacheManager: CacheManager;
  private retryHandler: RetryHandler;
  private readonly modelName: string = 'gemini-2.5-flash';
  private readonly supportsSystemInstruction: boolean = true; // Gemini models support system instructions
  private readonly defaultTemperature: number = 0.7;
  private readonly defaultMaxTokens: number = 2048;

  /**
   * Initialize Gemini service with API key
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    
    // Configure model based on whether it supports system instructions
    const modelConfig: any = {
      model: this.modelName,
      generationConfig: {
        temperature: this.defaultTemperature,
        maxOutputTokens: this.defaultMaxTokens,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    };
    
    // Only add system instruction for models that support it (Gemini models, not Gemma)
    if (this.supportsSystemInstruction) {
      modelConfig.systemInstruction = "You are Jadoo, an AI study assistant for StudyForge. Your identity is Jadoo. When asked who you are, identify yourself as Jadoo. You can answer questions about any topic including AI models (ChatGPT, Gemini, Claude, etc.), technology, and all academic subjects. Your purpose is to help students learn about any educational topic they're curious about.";
    }
    
    this.model = this.client.getGenerativeModel(modelConfig);

    this.cacheManager = new CacheManager();
    this.retryHandler = new RetryHandler();
  }

  /**
   * Core method for generating content with error handling and caching
   */
  async generateContent(
    prompt: string,
    options: GenerationOptions = {},
    userId?: number
  ): Promise<string> {
    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 10000) {
      throw new Error('Prompt exceeds maximum length of 10,000 characters');
    }

    const temperature = options.temperature ?? this.defaultTemperature;
    const maxOutputTokens = options.maxOutputTokens ?? this.defaultMaxTokens;

    // Check cache first
    const cachedResponse = this.cacheManager.get(prompt, this.modelName, temperature);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Generate content with retry logic
    const startTime = Date.now();
    const response = await this.retryHandler.executeWithRetry(
      async () => {
        const model = this.client.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            temperature,
            maxOutputTokens,
            topP: options.topP,
            topK: options.topK,
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (!text) {
          throw new Error('No response generated from AI');
        }

        return text;
      },
      3,
      1000,
      userId
    );

    const duration = Date.now() - startTime;

    // Log successful generation
    this.log('INFO', 'generate_content', userId, duration, {
      promptLength: prompt.length,
      responseLength: response.length,
      temperature,
      maxOutputTokens,
    });

    // Cache the response
    this.cacheManager.set(prompt, this.modelName, temperature, response);

    return response;
  }

  /**
   * Generate chat response with conversation history
   */
  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: GenerationOptions = {},
    userId?: number
  ): Promise<string> {
    // Convert messages to Gemini format
    const geminiMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    // Add system message as context if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    let prompt = '';

    if (systemMessage) {
      prompt = `${systemMessage.content}\n\n`;
    }

    // For single-turn conversations, use generateContent
    if (geminiMessages.length === 1) {
      prompt += geminiMessages[0].parts[0].text;
      return this.generateContent(prompt, options, userId);
    }

    // For multi-turn conversations, use chat
    const startTime = Date.now();
    const response = await this.retryHandler.executeWithRetry(
      async () => {
        // Prepare chat history (all messages except the last one)
        let history = geminiMessages.slice(0, -1);
        
        // Gemini requires chat history to start with a 'user' message
        // If history starts with 'model', remove it or prepend a user message
        if (history.length > 0 && history[0].role === 'model') {
          // Remove leading model messages until we find a user message
          while (history.length > 0 && history[0].role === 'model') {
            history = history.slice(1);
          }
        }
        
        const chat = this.model.startChat({
          history,
          generationConfig: {
            temperature: options.temperature ?? this.defaultTemperature,
            maxOutputTokens: options.maxOutputTokens ?? this.defaultMaxTokens,
          },
        });

        const lastMessage = geminiMessages[geminiMessages.length - 1];
        const result = await chat.sendMessage(lastMessage.parts[0].text);
        const text = result.response.text();

        if (!text) {
          throw new Error('No response generated from AI');
        }

        return text;
      },
      3,
      1000,
      userId
    );

    const duration = Date.now() - startTime;
    this.log('INFO', 'generate_chat_response', userId, duration, {
      messageCount: messages.length,
      responseLength: response.length,
    });

    return response;
  }

  /**
   * Summarize text with key points and keywords extraction
   * Handles large documents by chunking them
   * Returns comprehensive summary with metadata
   */
  async summarizeText(
    text: string,
    maxLength: number = 500,
    userId?: number,
    summaryType: 'concise' | 'detailed' | 'eli5' | 'academic' | 'balanced' = 'balanced'
  ): Promise<{ 
    summary: string; 
    keyPoints: string[]; 
    keywords: string[];
    readingTime: number;
    difficultyLevel: 'Easy' | 'Medium' | 'Hard';
    compression: number;
    insights?: string[];
    applications?: string[];
    relatedLinks?: Array<{ title: string; url: string }>;
  }> {
    // Define comprehensive style instructions based on summary type
    const styleInstructions: Record<string, { prompt: string; format: string }> = {
      concise: {
        prompt: 'You are creating a CONCISE summary with KEY POINTS ONLY.',
        format: `Provide a short summary with 3–6 crisp bullet points. Focus ONLY on essential facts, statistics, and core ideas. 
- Use bullet points (•) for each key point
- Keep each point to 1-2 sentences maximum
- Avoid long explanations or examples
- Make it scannable and minimal
- Focus on what's most important`
      },
      detailed: {
        prompt: 'You are creating a DETAILED, COMPREHENSIVE summary.',
        format: `Create a well-organized summary with multiple paragraphs that covers every important concept, example, and reasoning.
- Use full paragraphs with proper structure
- Include context, examples, and nuanced explanations
- Maintain logical flow with smooth transitions
- Cover all major points thoroughly
- Organize information clearly with topic sentences`
      },
      eli5: {
        prompt: 'You are explaining this topic to a 5-year-old child in EXTREMELY SIMPLE language.',
        format: `Explain in very simple, friendly, and easy-to-understand language:
- Use short, simple sentences (like talking to a child)
- Include analogies and real-world examples
- Avoid ALL jargon and technical terms
- Make it fun and engaging
- Use everyday language that anyone can understand
- Pretend you're explaining to someone who knows nothing about the topic`
      },
      academic: {
        prompt: 'You are writing a FORMAL ACADEMIC summary in scholarly format.',
        format: `Write a formal, academic-style summary using scholarly conventions:
- Use advanced vocabulary and technical terminology
- Maintain formal, objective tone throughout
- Structure with clear sections (Introduction, Discussion, Conclusion if applicable)
- Use precise, sophisticated sentence structure
- Include scholarly analysis and critical thinking
- Follow academic writing conventions
- Maintain professional distance and objectivity`
      },
      balanced: {
        prompt: 'You are creating a BALANCED summary that is both clear and informative.',
        format: `Strike a balance between clarity and depth:
- Use professional yet accessible language
- Be informative without overwhelming
- Include key details but stay focused
- Maintain readability while being thorough`
      }
    };
    
    const styleConfig = styleInstructions[summaryType] || styleInstructions.balanced;
    // If text is too large, chunk it and summarize each chunk
    const MAX_CHUNK_SIZE = 8000; // Leave room for prompt overhead
    
    let summary: string;
    
    if (text.length > MAX_CHUNK_SIZE) {
      // Split text into chunks
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
        chunks.push(text.slice(i, i + MAX_CHUNK_SIZE));
      }
      
      // Summarize each chunk following the strict style requirements
      const chunkSummaries: string[] = [];
      for (const chunk of chunks) {
        const chunkPrompt = `${styleConfig.prompt}

CRITICAL RULES:
1. Follow the selected summary type STRICTLY - tone, format, and depth must match exactly
2. Do NOT mix multiple summary styles
3. Ensure clarity, coherence, and grammatical accuracy
4. Keep the summary faithful to the original text - no personal opinions or assumptions
5. Maintain consistent formatting throughout

TEXT TO SUMMARIZE:
${chunk}

FORMAT REQUIREMENTS:
${styleConfig.format}

Provide ONLY the summary text following the format requirements above. Do not add any extra commentary.`;
        
        const chunkSummary = await this.generateContent(chunkPrompt, { maxOutputTokens: 512 }, userId);
        chunkSummaries.push(chunkSummary);
      }
      
      // Combine chunk summaries into final summary
      const combinedText = chunkSummaries.join('\n\n');
      const finalPrompt = `${styleConfig.prompt}

You are combining multiple section summaries into ONE cohesive final summary (approximately ${maxLength} characters).

CRITICAL RULES:
1. Follow the selected summary type STRICTLY - tone, format, and depth must match exactly
2. Do NOT mix multiple summary styles
3. Ensure clarity, coherence, and grammatical accuracy
4. Keep the summary faithful to the original content - no personal opinions
5. Maintain consistent formatting throughout

SECTION SUMMARIES TO COMBINE:
${combinedText}

FORMAT REQUIREMENTS:
${styleConfig.format}

Create a unified, well-structured final summary that follows ALL the format requirements above. Provide ONLY the final summary text.`;
      
      summary = await this.generateContent(finalPrompt, { maxOutputTokens: 1024 }, userId);
    } else {
      // Text is small enough to summarize directly
      const prompt = `${styleConfig.prompt}

CRITICAL RULES:
1. Follow the selected summary type STRICTLY - tone, format, and depth must match exactly
2. Do NOT mix multiple summary styles
3. Ensure clarity, coherence, and grammatical accuracy
4. Keep the summary faithful to the original text - no personal opinions or assumptions
5. Maintain consistent formatting throughout
6. Adapt sentence complexity and vocabulary according to the summary type

TEXT TO SUMMARIZE:
${text}

FORMAT REQUIREMENTS:
${styleConfig.format}

Target length: approximately ${maxLength} characters

Provide ONLY the summary text following the format requirements above. Do not add any extra commentary or explanations.`;

      summary = await this.generateContent(prompt, { maxOutputTokens: 1024 }, userId);
    }

    // Extract key points using AI - adapt style to match summary type
    const keyPointsStyleGuide = summaryType === 'eli5' 
      ? 'Use simple, child-friendly language for each point'
      : summaryType === 'academic'
      ? 'Use formal, scholarly language for each point'
      : summaryType === 'concise'
      ? 'Be extremely brief and to-the-point'
      : 'Use clear, professional language';
    
    const keyPointsPrompt = `Based on this summary, extract 3-5 key takeaways or main points. Each point should be:
- Concise (one clear sentence)
- Actionable or insightful
- Capture a distinct important idea
- ${keyPointsStyleGuide}

Summary:
${summary}

Provide the key points as a numbered list (1., 2., 3., etc.). Match the tone and vocabulary level of the summary type.`;

    const keyPointsText = await this.generateContent(keyPointsPrompt, { maxOutputTokens: 256, temperature: 0.5 }, userId);
    
    // Parse the numbered list
    const keyPoints = keyPointsText
      .split(/\n/)
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(point => point.length > 0)
      .slice(0, 5);

    // Extract keywords using AI for better relevance
    const keywordsPrompt = `Extract 8-10 important keywords or key phrases from this text. Focus on:
- Technical terms and concepts
- Main topics and themes
- Important names or entities
- Critical terminology

Text:
${text.slice(0, 3000)}

Provide only the keywords/phrases separated by commas.`;

    const keywordsText = await this.generateContent(keywordsPrompt, { maxOutputTokens: 128, temperature: 0.3 }, userId);
    
    // Parse comma-separated keywords
    const keywords = keywordsText
      .split(/[,\n]/)
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 2 && kw.length < 50)
      .slice(0, 10);

    // Calculate metadata
    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/minute
    const compression = Math.round((1 - summary.length / text.length) * 100);
    
    // Determine difficulty level based on text complexity
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / wordCount;
    const difficultyLevel: 'Easy' | 'Medium' | 'Hard' = 
      avgWordLength < 5 ? 'Easy' : avgWordLength < 7 ? 'Medium' : 'Hard';

    // Generate insights (2-3 analytical insights)
    let insights: string[] = [];
    if (summaryType === 'detailed' || summaryType === 'academic') {
      const insightsPrompt = `Based on this summary, provide 2-3 analytical insights or implications. Each insight should:
- Reveal a deeper understanding or connection
- Be thought-provoking and analytical
- Go beyond surface-level observations
- Be concise (1-2 sentences each)

Summary:
${summary}

Provide only the insights as a numbered list (1., 2., 3.).`;

      try {
        const insightsText = await this.generateContent(insightsPrompt, { maxOutputTokens: 256, temperature: 0.6 }, userId);
        insights = insightsText
          .split(/\n/)
          .filter(line => /^\d+\./.test(line.trim()))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(insight => insight.length > 0)
          .slice(0, 3);
      } catch (error) {
        // Insights are optional, continue without them
        this.log('WARN', 'generate_insights_failed', userId, undefined, { error: (error as Error).message });
      }
    }

    // Generate applications/use cases (1-3 real-world examples)
    let applications: string[] = [];
    if (summaryType === 'detailed' || summaryType === 'academic') {
      const applicationsPrompt = `Based on this content, provide 1-3 real-world applications or use cases where these concepts are applied. Each should:
- Be practical and concrete
- Show real-world relevance
- Be concise (1-2 sentences each)

Content:
${text.slice(0, 2000)}

Provide only the applications as a numbered list (1., 2., 3.).`;

      try {
        const applicationsText = await this.generateContent(applicationsPrompt, { maxOutputTokens: 256, temperature: 0.6 }, userId);
        applications = applicationsText
          .split(/\n/)
          .filter(line => /^\d+\./.test(line.trim()))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(app => app.length > 0)
          .slice(0, 3);
      } catch (error) {
        // Applications are optional, continue without them
        this.log('WARN', 'generate_applications_failed', userId, undefined, { error: (error as Error).message });
      }
    }

    // Generate related links/resources (5-7 relevant educational resources)
    let relatedLinks: Array<{ title: string; url: string }> = [];
    
    // Use AI to generate topic-specific educational links
    try {
      relatedLinks = await this.generateEducationalLinks(text, keywords, userId);
    } catch (error) {
      this.log('WARN', 'generate_related_links_failed', userId, undefined, { 
        error: (error as Error).message 
      });
    }

    this.log('INFO', 'summarize_text', userId, undefined, {
      textLength: text.length,
      summaryLength: summary.length,
      keyPointsCount: keyPoints.length,
      keywordsCount: keywords.length,
      readingTime,
      difficultyLevel,
      compression,
      insightsCount: insights.length,
      applicationsCount: applications.length,
      relatedLinksCount: relatedLinks.length,
    });

    return { 
      summary, 
      keyPoints, 
      keywords,
      readingTime,
      difficultyLevel,
      compression,
      insights: insights.length > 0 ? insights : undefined,
      applications: applications.length > 0 ? applications : undefined,
      relatedLinks: relatedLinks.length > 0 ? relatedLinks : undefined,
    };
  }

  /**
   * Generate topic-specific educational links using AI
   */
  private async generateEducationalLinks(
    text: string, 
    keywords: string[], 
    userId?: number
  ): Promise<Array<{ title: string; url: string }>> {
    try {
      // Extract main topic from keywords and text
      const mainTopic = keywords.slice(0, 3).join(', ');
      
      const linksPrompt = `Based on this content and keywords, provide 5-7 highly relevant, topic-specific educational resources.

KEYWORDS: ${keywords.join(', ')}

CONTENT PREVIEW:
${text.slice(0, 1500)}

CRITICAL RULES:
1. Analyze the MAIN TOPIC and SUBTOPICS from the content
2. Provide ONLY topic-specific links (NOT generic resources)
3. Use reliable educational sources: Wikipedia (specific topic), official documentation, GeeksforGeeks (topic page), Coursera/edX (specific courses), academic institutions, research papers
4. Each link must be directly relevant to the document's subject matter
5. Avoid generic homepages - link to specific topic pages

Return ONLY a JSON array in this exact format:
[
  {"title": "Specific Topic Name - Source", "url": "https://example.com/specific-topic"},
  {"title": "Another Specific Resource", "url": "https://example.com/another-topic"}
]

Provide 5-7 links. Return ONLY the JSON array, no other text.`;

      const response = await this.generateContent(
        linksPrompt, 
        { maxOutputTokens: 512, temperature: 0.4 }, 
        userId
      );

      // Parse the JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const links = JSON.parse(jsonMatch[0]);
        
        // Validate the links
        if (Array.isArray(links) && links.length > 0) {
          return links
            .filter(link => link.title && link.url && link.url.startsWith('http'))
            .slice(0, 7);
        }
      }

      // Fallback: generate basic Wikipedia link if AI fails
      if (keywords.length > 0) {
        const mainKeyword = keywords[0].replace(/\s+/g, '_');
        return [{
          title: `${keywords[0]} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${mainKeyword}`
        }];
      }

      return [];
    } catch (error) {
      this.log('WARN', 'generate_links_failed', userId, undefined, { 
        error: (error as Error).message 
      });
      
      // Fallback: return Wikipedia link for main keyword
      if (keywords.length > 0) {
        const mainKeyword = keywords[0].replace(/\s+/g, '_');
        return [{
          title: `${keywords[0]} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${mainKeyword}`
        }];
      }
      
      return [];
    }
  }

  /**
   * Generate a flashcard with question and answer
   */
  async generateFlashcard(
    topic: string,
    context?: string,
    userId?: number
  ): Promise<FlashcardData> {
    const prompt = `Generate a flashcard for studying the topic: "${topic}"${context ? `\n\nContext: ${context}` : ''}

Create a clear, concise question and a well-structured answer. 

IMPORTANT FORMATTING RULES:
- Do NOT use markdown formatting (no **, *, #, etc.)
- Write in plain text only
- Use proper sentences with periods
- Break long answers into 2-3 short paragraphs
- Each paragraph should be 1-2 sentences maximum
- Use simple, clear language
- Avoid special characters and symbols

Return the response in the following JSON format:
{
  "question": "Your clear, concise question here",
  "answer": "Your well-structured answer here. Use proper sentences. Break into short paragraphs if needed.",
  "difficulty": "easy|medium|hard"
}

Provide only the JSON object without any additional text or markdown formatting.`;

    const response = await this.generateContent(prompt, { temperature: 0.8 }, userId);

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (!data.question || !data.answer) {
          throw new Error('Invalid flashcard data: missing question or answer');
        }

        return {
          question: data.question,
          answer: data.answer,
          difficulty: data.difficulty || 'medium',
          tags: [topic],
        };
      }

      // If no JSON match found, try fallback parsing
      const questionMatch = response.match(/question['":\s]+([^"]+)/i);
      const answerMatch = response.match(/answer['":\s]+([^"]+)/i);

      if (questionMatch && answerMatch) {
        return {
          question: questionMatch[1].trim(),
          answer: answerMatch[1].trim(),
          difficulty: 'medium',
          tags: [topic],
        };
      }

      throw new Error('Failed to parse flashcard response');
    } catch (error) {
      // If JSON parsing fails, try fallback regex parsing
      const questionMatch = response.match(/question['":\s]+([^"]+)/i);
      const answerMatch = response.match(/answer['":\s]+([^"]+)/i);

      if (questionMatch && answerMatch) {
        return {
          question: questionMatch[1].trim(),
          answer: answerMatch[1].trim(),
          difficulty: 'medium',
          tags: [topic],
        };
      }

      throw new Error('Failed to parse flashcard response');
    }
  }

  /**
   * Generate multiple flashcards from document text
   */
  async generateFlashcardsFromDocument(
    documentText: string,
    count: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    userId?: number
  ): Promise<FlashcardData[]> {
    // Validate inputs
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document text cannot be empty');
    }

    if (count < 5 || count > 20) {
      throw new Error('Count must be between 5 and 20');
    }

    // Truncate document text if too long (keep first 8000 characters)
    const truncatedText = documentText.length > 8000 
      ? documentText.substring(0, 8000) + '...' 
      : documentText;

    const prompt = `Analyze the following document and generate exactly ${count} flashcards for studying. Each flashcard should:
- Focus on key concepts, definitions, or important facts
- Have a clear, concise question
- Have a comprehensive answer
- Be at ${difficulty} difficulty level
- Cover different topics from the document

Document:
${truncatedText}

Return the response as a JSON array in the following format:
[
  {
    "question": "Question text here",
    "answer": "Answer text here",
    "difficulty": "${difficulty}"
  }
]

Generate exactly ${count} flashcards. Provide only the JSON array without any additional text or markdown formatting.`;

    const response = await this.generateContent(
      prompt,
      { temperature: 0.7, maxOutputTokens: 2048 },
      userId
    );

    try {
      // Try to parse as JSON array
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (!Array.isArray(data)) {
          throw new Error('Response is not an array');
        }

        if (data.length === 0) {
          throw new Error('No flashcards generated');
        }

        // Validate and format each flashcard
        const flashcards: FlashcardData[] = data.map((item, index) => {
          if (!item.question || !item.answer) {
            throw new Error(`Invalid flashcard at index ${index}: missing question or answer`);
          }

          return {
            question: item.question.trim(),
            answer: item.answer.trim(),
            difficulty: item.difficulty || difficulty,
            tags: [],
          };
        });

        this.log('INFO', 'generate_flashcards_from_document', userId, undefined, {
          documentLength: documentText.length,
          requestedCount: count,
          generatedCount: flashcards.length,
          difficulty,
        });

        return flashcards;
      }

      throw new Error('Failed to parse flashcards response: no JSON array found');
    } catch (error) {
      this.log('ERROR', 'generate_flashcards_from_document_failed', userId, undefined, {
        error: (error as Error).message,
        documentLength: documentText.length,
        requestedCount: count,
      });
      throw new Error('Failed to generate flashcards from document: ' + (error as Error).message);
    }
  }

  /**
   * Generate a multiple choice question
   */
  async generateMCQ(
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    context?: string,
    userId?: number
  ): Promise<MCQData> {
    const prompt = `Generate a ${difficulty} multiple choice question about: "${topic}"${context ? `\n\nContext: ${context}` : ''}

Create a clear question with 4 options (A, B, C, D) and provide an explanation for the correct answer.

Return the response in the following JSON format:
{
  "question": "Your question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOption": 0,
  "explanation": "Explanation of why this is correct",
  "difficulty": "${difficulty}"
}

The correctOption should be the index (0-3) of the correct answer in the options array.
Provide only the JSON object without any additional text or markdown formatting.`;

    const response = await this.generateContent(prompt, { temperature: 0.7 }, userId);

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (!data.question || !data.options || data.options.length !== 4) {
          throw new Error('Invalid MCQ data: missing question or invalid options');
        }

        if (data.correctOption < 0 || data.correctOption > 3) {
          throw new Error('Invalid MCQ data: correctOption must be between 0 and 3');
        }

        return {
          question: data.question,
          options: data.options,
          correctOption: data.correctOption,
          explanation: data.explanation || 'No explanation provided',
          difficulty,
        };
      }
    } catch (error) {
      throw new Error('Failed to parse MCQ response: ' + (error as Error).message);
    }

    throw new Error('Failed to generate valid MCQ');
  }

  /**
   * Generate code solution with explanation
   */
  async generateCode(
    problem: string,
    language: string,
    context?: string,
    userId?: number
  ): Promise<CodeData> {
    const prompt = `Generate a ${language} code solution for the following problem:

Problem: ${problem}${context ? `\n\nAdditional context: ${context}` : ''}

Return the response in the following JSON format:
{
  "code": "Your code here",
  "explanation": "Explanation of the solution",
  "language": "${language}",
  "complexity": "Time and space complexity analysis"
}

Provide only the JSON object without any additional text or markdown formatting.`;

    const response = await this.generateContent(
      prompt,
      { temperature: 0.5, maxOutputTokens: 1500 },
      userId
    );

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (!data.code || !data.explanation) {
          throw new Error('Invalid code data: missing code or explanation');
        }

        return {
          code: data.code,
          explanation: data.explanation,
          language,
          complexity: data.complexity,
        };
      }

      // If no JSON match found, try fallback parsing
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        const code = codeMatch[1].trim();
        const explanation = response.replace(/```[\w]*\n[\s\S]*?```/, '').trim();
        
        return {
          code,
          explanation: explanation || 'Code solution generated',
          language,
        };
      }

      throw new Error('Failed to parse code response');
    } catch (error) {
      // Fallback: extract code from markdown code blocks
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        const code = codeMatch[1].trim();
        const explanation = response.replace(/```[\w]*\n[\s\S]*?```/, '').trim();
        
        return {
          code,
          explanation: explanation || 'Code solution generated',
          language,
        };
      }

      throw new Error('Failed to parse code response');
    }
  }

  /**
   * Generate a study plan with schedule
   */
  async generateStudyPlan(
    subject: string,
    durationDays: number,
    goal: string,
    userId?: number
  ): Promise<StudyPlanData> {
    const prompt = `Create a ${durationDays}-day study plan for: "${subject}"

Goal: ${goal}

Generate a structured study plan with daily tasks and resources.

Return the response in the following JSON format:
{
  "title": "Study plan title",
  "description": "Brief description of the study plan",
  "scheduleData": [
    {
      "id": "1",
      "title": "Day 1 title",
      "description": "Brief description",
      "duration": 60,
      "completed": false
    }
  ]
}

IMPORTANT:
- Generate exactly ${durationDays} items in the scheduleData array
- Each item must have: id (string), title (string), description (string), duration (number in minutes), completed (boolean false)
- Keep descriptions concise (under 100 characters)
- Duration should be realistic study time in minutes (30-120 minutes)
- Provide ONLY valid JSON without any markdown formatting, code blocks, or additional text`;

    const response = await this.generateContent(
      prompt,
      { temperature: 0.7, maxOutputTokens: 2048 },
      userId
    );

    try {
      // Extract JSON from response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      let data;
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // Try to repair common JSON issues
        let repairedJson = jsonMatch[0];
        
        // Remove trailing commas before closing brackets
        repairedJson = repairedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // Try parsing again
        data = JSON.parse(repairedJson);
      }
      
      if (!data.title || !data.scheduleData || !Array.isArray(data.scheduleData)) {
        throw new Error('Invalid study plan data: missing title or scheduleData');
      }

      // Ensure each item has required fields
      const scheduleData = data.scheduleData.map((item: any, index: number) => ({
        id: item.id || String(index + 1),
        title: item.title || `Day ${index + 1}`,
        description: item.description || '',
        duration: typeof item.duration === 'number' ? item.duration : 60,
        completed: false,
      }));

      return {
        title: data.title,
        description: data.description || '',
        scheduleData: scheduleData,
      };
    } catch (error) {
      throw new Error('Failed to parse study plan response: ' + (error as Error).message);
    }
  }

  /**
   * Log service operations
   */
  private log(
    level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG',
    action: string,
    userId?: number,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'gemini',
      action,
      userId,
      duration,
      metadata,
    };
    console.log(JSON.stringify(logEntry));
  }
}

// Export a singleton instance
export const geminiService = new GeminiService(process.env.GEMINI_API_KEY || '');
