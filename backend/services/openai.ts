import OpenAI from 'openai';

// Initialize the OpenAI client with the API key from the environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIServiceOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * AI service for handling interactions with OpenAI
 */
export class AIService {
  /**
   * Generate a chat completion response
   */
  async generateChatResponse(
    messages: ChatMessage[],
    options: AIServiceOptions = {}
  ): Promise<string> {
    try {
      const { temperature = 0.7, maxTokens = 500 } = options;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Generate a flashcard for a given topic or concept
   */
  async generateFlashcard(
    topic: string,
    context?: string
  ): Promise<{ question: string; answer: string }> {
    try {
      const systemPrompt = 'You are an educational AI assistant that creates high-quality flashcards.';
      const userPrompt = `Create a flashcard for the topic: ${topic}. ${
        context ? `Additional context: ${context}` : ''
      }
      
      Format your response as a JSON object with "question" and "answer" fields. The question should be clear and concise. The answer should be detailed but not excessively long.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.generateChatResponse(messages);
      
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          if (parsedResponse.question && parsedResponse.answer) {
            return parsedResponse;
          }
        }
      } catch (parseError) {
        console.error('Error parsing flashcard response:', parseError);
      }

      // Fallback parsing for non-JSON responses
      const parts = response.split(/\n+/);
      let question = '';
      let answer = '';

      if (parts.length >= 2) {
        for (const part of parts) {
          if (part.toLowerCase().includes('question') && !question) {
            question = part.replace(/^.*question:?\s*/i, '').trim();
          } else if (part.toLowerCase().includes('answer') && !answer) {
            answer = part.replace(/^.*answer:?\s*/i, '').trim();
          }
        }
      }

      return {
        question: question || `What is ${topic}?`,
        answer: answer || 'Failed to generate answer.',
      };
    } catch (error) {
      console.error('Error generating flashcard:', error);
      throw new Error('Failed to generate flashcard');
    }
  }

  /**
   * Generate a multiple-choice question for a given topic
   */
  async generateMCQ(
    topic: string,
    difficulty: string = 'medium',
    context?: string
  ): Promise<{
    question: string;
    options: string[];
    correctOption: number;
    explanation: string;
  }> {
    try {
      const systemPrompt = 'You are an educational AI assistant that creates high-quality multiple-choice questions.';
      const userPrompt = `Create a ${difficulty}-difficulty multiple choice question about ${topic}. ${
        context ? `Use this context: ${context}` : ''
      }
      
      Format your response as a JSON object with the following fields:
      - "question": The question text
      - "options": An array of 4 possible answers
      - "correctOption": The index of the correct answer (0-3)
      - "explanation": A brief explanation of why the correct answer is right
      
      Make sure the question is challenging but fair.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.generateChatResponse(messages);
      
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          if (
            parsedResponse.question &&
            Array.isArray(parsedResponse.options) &&
            typeof parsedResponse.correctOption === 'number' &&
            parsedResponse.explanation
          ) {
            return parsedResponse;
          }
        }
      } catch (parseError) {
        console.error('Error parsing MCQ response:', parseError);
      }

      // Fallback - return a basic MCQ structure if parsing fails
      return {
        question: `What is the most important concept in ${topic}?`,
        options: [
          'First concept',
          'Second concept',
          'Third concept',
          'Fourth concept',
        ],
        correctOption: 0,
        explanation: 'Failed to generate a proper explanation.',
      };
    } catch (error) {
      console.error('Error generating MCQ:', error);
      throw new Error('Failed to generate multiple-choice question');
    }
  }

  /**
   * Generate code based on a programming problem
   */
  async generateCode(
    problem: string,
    language: string,
    context?: string
  ): Promise<{
    code: string;
    explanation: string;
  }> {
    try {
      const systemPrompt = `You are an AI programming assistant that helps students with ${language} programming problems.`;
      const userPrompt = `Generate code in ${language} to solve this problem: ${problem}. ${
        context ? `Additional context: ${context}` : ''
      }
      
      Format your response as a JSON object with:
      - "code": The complete working code solution (properly escaped for JSON)
      - "explanation": A clear explanation of how the code works, line by line
      
      Make sure the code is optimized, well-commented, and follows best practices.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.generateChatResponse(messages, { maxTokens: 1000 });
      
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          if (parsedResponse.code && parsedResponse.explanation) {
            return parsedResponse;
          }
        }
      } catch (parseError) {
        console.error('Error parsing code generation response:', parseError);
      }

      // Try to extract code and explanation manually if JSON parsing fails
      const codeBlockMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const code = codeBlockMatch ? codeBlockMatch[1].trim() : '';
      
      // Find explanation (everything after the last code block)
      const parts = response.split(/```(?:\w+)?\n[\s\S]*?```/);
      const explanation = parts[parts.length - 1].trim();

      return {
        code: code || `// Failed to generate ${language} code for: ${problem}`,
        explanation: explanation || 'Failed to generate explanation.',
      };
    } catch (error) {
      console.error('Error generating code:', error);
      throw new Error('Failed to generate code');
    }
  }

  /**
   * Generate a study plan for a subject
   */
  async generateStudyPlan(
    subject: string,
    durationDays: number,
    goal: string
  ): Promise<{
    title: string;
    description: string;
    scheduleData: any;
  }> {
    try {
      const systemPrompt = 'You are an AI educational assistant that creates effective study plans.';
      const userPrompt = `Create a ${durationDays}-day study plan for ${subject}. The goal is: ${goal}
      
      Format your response as a JSON object with:
      - "title": A descriptive title for the study plan
      - "description": A brief overview of the plan
      - "scheduleData": An array of daily tasks, where each task has:
         * "day": The day number (1 to ${durationDays})
         * "title": A brief title for the day's focus
         * "tasks": Array of specific tasks for the day
         * "resources": Recommended resources
      
      Make the plan realistic, balanced, and tailored to achieve the goal.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.generateChatResponse(messages, { maxTokens: 1500 });
      
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          if (
            parsedResponse.title &&
            parsedResponse.description &&
            parsedResponse.scheduleData
          ) {
            return parsedResponse;
          }
        }
      } catch (parseError) {
        console.error('Error parsing study plan response:', parseError);
      }

      // Fallback with basic structure
      return {
        title: `${durationDays}-Day Study Plan for ${subject}`,
        description: `A structured study plan to help you ${goal}`,
        scheduleData: Array.from({ length: durationDays }, (_, i) => ({
          day: i + 1,
          title: `Day ${i + 1}`,
          tasks: ['Review basic concepts', 'Practice problems', 'Summarize learnings'],
          resources: ['Textbooks', 'Online courses', 'Practice exercises'],
        })),
      };
    } catch (error) {
      console.error('Error generating study plan:', error);
      throw new Error('Failed to generate study plan');
    }
  }

  /**
   * Summarize a document or text
   */
  async summarizeText(
    text: string,
    maxLength: number = 500
  ): Promise<string> {
    try {
      const systemPrompt = 'You are an AI assistant that creates clear, concise summaries while preserving key information.';
      const userPrompt = `Summarize the following text in ${maxLength} words or less. Focus on the main points and key details:
      
      ${text}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      return await this.generateChatResponse(messages);
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw new Error('Failed to summarize text');
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();