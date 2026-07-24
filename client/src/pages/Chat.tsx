import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User as UserIcon, Sparkles, Copy, Check, Menu, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import MessageFormatter from "@/components/chat/MessageFormatter";
import MessageActionBar from "@/components/chat/MessageActionBar";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Helper function to generate personalized greeting
const getPersonalizedGreeting = (user?: { username?: string; email?: string; fullName?: string } | null): string => {
  // Extract first name from fullName or use username, or email prefix as fallback
  let name = "there";
  
  if (user?.fullName) {
    // Extract first name from full name
    name = user.fullName.split(' ')[0];
  } else if (user?.username) {
    name = user.username;
  } else if (user?.email) {
    // Use email prefix before @
    name = user.email.split('@')[0];
  }
  
  const greetings = [
    `Hey ${name}! 👋 I'm Jadoo, your AI study assistant. Let's dive in!`,
    `Hi ${name}! 😊 I'm Jadoo, ready to help you learn something new today.`,
    `Welcome back, ${name}! 🌟 I'm Jadoo, here to make studying easier for you.`,
    `Hello ${name}! 🎓 I'm Jadoo, your AI study buddy. What would you like to explore today?`,
    `Hey ${name}! ✨ I'm Jadoo, excited to help you with your studies today!`,
  ];
  
  // Select a random greeting for variety
  return greetings[Math.floor(Math.random() * greetings.length)];
};

export default function Chat() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  
  // Persist active session ID across page refreshes
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem('activeChatSessionId');
  });
  
  // Generate personalized initial greeting
  const getInitialMessage = (): Message => ({
    role: 'system',
    content: getPersonalizedGreeting(user),
    timestamp: new Date()
  });
  
  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Sidebar closed by default
  const [showQuickActions, setShowQuickActions] = useState(false); // Quick actions hidden by default
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Save active session ID to sessionStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('activeChatSessionId', sessionId);
    } else {
      sessionStorage.removeItem('activeChatSessionId');
    }
  }, [sessionId]);

  // Load active conversation on mount if sessionId exists
  useEffect(() => {
    if (sessionId && user) {
      const chatId = parseInt(sessionId);
      if (!isNaN(chatId)) {
        loadChatSession(chatId);
      }
    }
  }, []); // Run only once on mount

  // Fetch chat history
  const { data: chatHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/chat/history'],
    queryFn: async () => {
      const response = await apiGet('/api/chat/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      
      return response.json();
    },
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Load a specific chat session
  const loadChatSession = async (chatId: number) => {
    try {
      const response = await apiGet(`/api/chat/history/${chatId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load chat session');
      }
      
      const data = await response.json();
      
      // Parse messages if they're stored as JSON string
      const parsedMessages = typeof data.chatHistory.messages === 'string' 
        ? JSON.parse(data.chatHistory.messages)
        : data.chatHistory.messages;
      
      // Ensure timestamps are Date objects
      const messagesWithDates = parsedMessages.map((msg: Message) => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
      }));
      
      setMessages(messagesWithDates);
      setSessionId(chatId.toString());
      
      toast({
        title: "Chat loaded",
        description: "Previous conversation loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to load chat",
        description: "Could not load the selected conversation",
        variant: "destructive",
      });
    }
  };

  // Start a new chat
  const startNewChat = () => {
    setMessages([getInitialMessage()]);
    setSessionId(null);
    sessionStorage.removeItem('activeChatSessionId');
    toast({
      title: "New chat started",
      description: "Ready for a new conversation",
    });
  };

  // Delete a chat session
  const deleteChatSession = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the chat when clicking delete
    
    try {
      const response = await apiDelete(`/api/chat/history/${chatId}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
      
      // If the deleted chat is currently active, start a new chat
      if (sessionId === chatId.toString()) {
        startNewChat();
      }
      
      // Refetch chat history
      refetchHistory();
      
      toast({
        title: "Chat deleted",
        description: "Conversation has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: "Could not delete the conversation",
        variant: "destructive",
      });
    }
  };

  // Start editing a chat title
  const startEditingChat = (chatId: number, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  // Save edited chat title
  const saveEditedTitle = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    
    try {
      const response = await apiPatch(`/api/chat/history/${chatId}`, {
        subject: editingTitle.trim(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update chat title');
      }
      
      setEditingChatId(null);
      setEditingTitle("");
      
      // Invalidate and refetch to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/chat/history'] });
      await refetchHistory();
      
      toast({
        title: "Title updated",
        description: "Chat title has been changed",
      });
    } catch (error) {
      toast({
        title: "Failed to update",
        description: "Could not update the chat title",
        variant: "destructive",
      });
    }
  };

  // Cancel editing
  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle("");
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 3);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Set up chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiPost('/api/chat', { 
        message,
        sessionId: sessionId,
        subject: 'General Study Help'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Store session ID for conversation continuity
      if (data.chatHistory && !sessionId) {
        setSessionId(data.chatHistory.id.toString());
      }
      
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content: data.response.content,
          timestamp: new Date()
        },
      ]);
      
      // Invalidate and refetch chat history query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/chat/history'] });
      refetchHistory();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get a response",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message to the chat
    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Send to API
    chatMutation.mutate(input);
    
    // Clear input
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Clear chat function
  const handleClearChat = () => {
    setMessages([getInitialMessage()]);
    setSessionId(null);
    toast({
      title: "Chat cleared",
      description: "All messages have been removed",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Strip Markdown formatting from text
  const stripMarkdown = (text: string): string => {
    let cleanText = text;
    
    // Remove code blocks (```language\ncode\n```) and keep only the code
    cleanText = cleanText.replace(/```[\w]*\n([\s\S]*?)```/g, '$1');
    
    // Remove inline code backticks (`code`)
    cleanText = cleanText.replace(/`([^`]+)`/g, '$1');
    
    // Remove headings (###, ##, #)
    cleanText = cleanText.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold (**text** or __text__)
    cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleanText = cleanText.replace(/__([^_]+)__/g, '$1');
    
    // Remove italic (*text* or _text_)
    cleanText = cleanText.replace(/\*([^*]+)\*/g, '$1');
    cleanText = cleanText.replace(/_([^_]+)_/g, '$1');
    
    // Remove strikethrough (~~text~~)
    cleanText = cleanText.replace(/~~([^~]+)~~/g, '$1');
    
    // Remove links [text](url) - keep only text
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove images ![alt](url)
    cleanText = cleanText.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // Remove HTML tags
    cleanText = cleanText.replace(/<[^>]+>/g, '');
    
    // Clean up extra whitespace
    cleanText = cleanText.trim();
    
    return cleanText;
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      // Strip Markdown formatting before copying
      const cleanText = stripMarkdown(text);
      await navigator.clipboard.writeText(cleanText);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dateObj);
    } catch (error) {
      return '';
    }
  };

  const handleRegenerate = async (messageIndex: number) => {
    if (!sessionId) return;

    try {
      const response = await apiPost('/api/chat/regenerate', {
        sessionId,
        messageIndex,
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate response');
      }

      const data = await response.json();

      // Replace the AI message at the given index
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        newMessages[messageIndex] = {
          role: 'assistant',
          content: data.response.content,
          timestamp: new Date(data.response.timestamp),
        };
        return newMessages;
      });

      toast({
        title: "Response regenerated",
        description: "A new response has been generated",
      });
    } catch (error) {
      toast({
        title: "Failed to regenerate",
        description: "Could not regenerate the response",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex bg-gradient-to-br from-background via-background to-primary/5">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse"></div>
                  <Avatar className="h-10 w-10 border-2 border-primary relative">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    AI Study Assistant
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Online & Ready to Help
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* New Chat Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewChat}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Start new chat"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  <span className="hidden sm:inline">New Chat</span>
                </Button>

                {/* Mobile Menu Toggle Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="lg:hidden text-muted-foreground hover:text-primary menu-toggle"
                  title={showSidebar ? "Close menu" : "Open menu"}
                >
                  {showSidebar ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>

                {/* Toggle Sidebar Button - Desktop */}
                {!showSidebar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSidebar(true)}
                    className="hidden lg:flex text-muted-foreground hover:text-primary"
                    title="Show chat history"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M9 3v18" />
                    </svg>
                    <span className="hidden sm:inline">History</span>
                  </Button>
                )}
                
                {/* Message Count Badge */}
                {messages.length > 1 && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                    <span className="text-xs font-medium text-muted-foreground">
                      {messages.length - 1} {messages.length === 2 ? 'message' : 'messages'}
                    </span>
                  </div>
                )}
                
                {/* AI Powered Badge */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI Powered</span>
                </div>
                
                {/* Clear Chat Button */}
                {messages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearChat}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Clear chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto relative" ref={messagesContainerRef}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
            {/* Welcome Screen - Show when only system message exists */}
            {messages.length === 1 && messages[0].role === 'system' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                  <Avatar className="h-20 w-20 border-4 border-primary relative">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                      <Bot className="h-10 w-10 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {user?.fullName 
                    ? `Welcome, ${user.fullName.split(' ')[0]}! 👋` 
                    : user?.username 
                    ? `Welcome, ${user.username}! 👋`
                    : user?.email 
                    ? `Welcome, ${user.email.split('@')[0]}! 👋`
                    : "Welcome to Jadoo AI Assistant"}
                </h2>
                
                <p className="text-muted-foreground mb-8 max-w-md">
                  I'm Jadoo, your AI study assistant. Ask me anything about your subjects, homework, or learning topics!
                </p>
                
                {/* Suggested Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  {[
                    "Explain photosynthesis",
                    "Help with calculus",
                    "What is machine learning?",
                    "Study tips for exams"
                  ].map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50 transition-all"
                      onClick={() => {
                        // Automatically send the message without setting input
                        const userMessage: Message = {
                          role: 'user',
                          content: suggestion,
                          timestamp: new Date()
                        };
                        setMessages(prev => [...prev, userMessage]);
                        setIsTyping(true);
                        chatMutation.mutate(suggestion);
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn(
                    "flex gap-3 mb-6",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <Avatar className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 border-2",
                    message.role === 'user' 
                      ? "border-primary/30" 
                      : message.role === 'system'
                      ? "border-muted"
                      : "border-primary/50"
                  )}>
                    <AvatarFallback className={cn(
                      message.role === 'user'
                        ? "bg-gradient-to-br from-primary to-primary/80"
                        : message.role === 'system'
                        ? "bg-muted"
                        : "bg-gradient-to-br from-primary/80 to-primary/60"
                    )}>
                      {message.role === 'user' ? (
                        <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                      ) : (
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className={cn(
                    "flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] group",
                    message.role === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <Card className={cn(
                      "p-3 sm:p-4 shadow-md transition-all hover:shadow-lg relative overflow-hidden max-w-full",
                      message.role === 'user'
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20"
                        : message.role === 'system'
                        ? "bg-gradient-to-br from-muted to-muted/80 border-muted"
                        : "bg-gradient-to-br from-card to-card/80 border-border"
                    )}>
                      <div className="text-sm sm:text-base leading-relaxed max-w-full overflow-x-hidden">
                        {message.role === 'assistant' ? (
                          <MessageFormatter content={message.content} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        )}
                      </div>
                      
                      {/* Copy Button (kept for backward compatibility) */}
                      {message.role !== 'system' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                            message.role === 'user' 
                              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" 
                              : "bg-background text-foreground hover:bg-accent"
                          )}
                          onClick={() => copyToClipboard(message.content, index)}
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </Card>
                    
                    {/* Timestamp */}
                    {message.timestamp && (
                      <span className="text-xs text-muted-foreground px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    )}

                    {/* Message Action Bar - Only for assistant messages */}
                    {message.role === 'assistant' && (
                      <MessageActionBar
                        messageId={index}
                        messageContent={message.content}
                        onRegenerate={() => handleRegenerate(index)}
                        className="ml-1"
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {chatMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mb-6"
              >
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-primary/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/60">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
                <Card className="p-4 bg-gradient-to-br from-card to-card/80">
                  <div className="flex gap-1.5">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
          
          {/* Scroll to Bottom Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 right-4 sm:right-8"
              >
                <Button
                  onClick={scrollToBottom}
                  size="icon"
                  className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                  title="Scroll to bottom"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 15-6 6-6-6" />
                    <path d="M12 3v18" />
                  </svg>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 max-w-4xl">
            {/* Quick Actions - Show when input is empty */}
            {!input && messages.length > 1 && showQuickActions && (
              <div className="mb-2">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Quick actions:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowQuickActions(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="quick-actions flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {[
                    { icon: "🔄", text: "Explain differently", action: "Can you explain that in a different way?" },
                    { icon: "📝", text: "Summarize", action: "Can you summarize the key points?" },
                    { icon: "💡", text: "Examples", action: "Can you give me some examples?" },
                    { icon: "❓", text: "More details", action: "Can you provide more details?" }
                  ].map((quick, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs hover:bg-primary/10 hover:border-primary/50 whitespace-nowrap flex-shrink-0"
                      onClick={() => {
                        // Automatically send the message without setting input
                        const userMessage: Message = {
                          role: 'user',
                          content: quick.action,
                          timestamp: new Date()
                        };
                        setMessages(prev => [...prev, userMessage]);
                        setIsTyping(true);
                        chatMutation.mutate(quick.action);
                        setShowQuickActions(false);
                      }}
                    >
                      <span className="mr-1">{quick.icon}</span>
                      {quick.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show Quick Actions button when hidden */}
            {!input && messages.length > 1 && !showQuickActions && (
              <div className="mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowQuickActions(true)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Show Quick Actions
                </Button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-end gap-2 p-1.5 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors focus-within:border-primary">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any study question... (Shift + Enter for new line)"
                  className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[200px] text-sm"
                  rows={1}
                  maxLength={10000}
                  disabled={chatMutation.isPending}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                  }}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all flex-shrink-0"
                  disabled={chatMutation.isPending || !input.trim()}
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {input.length}/10000 characters
                </p>
                <p className="text-xs text-muted-foreground">
                  Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Shift</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> for new line
                </p>
              </div>
            </form>
          </div>
        </div>
        </div>

        {/* Mobile Overlay Backdrop */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}
        </AnimatePresence>

        {/* Chat History Sidebar - Right Side */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "flex flex-col border-l bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-md shadow-xl",
                "w-full sm:w-80",
                "lg:relative lg:flex",
                "fixed right-0 top-0 h-full z-50 chat-history-sidebar"
              )}
            >
              {/* Sidebar Header */}
              <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Chat History
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(false)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                    title="Close sidebar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </Button>
                </div>
                
                {/* New Chat Button */}
                <Button
                  onClick={startNewChat}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  New Chat
                </Button>
              </div>

              {/* Chat History List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading history...</p>
                  </div>
                ) : chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0 ? (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">
                      Recent Conversations
                    </div>
                    {chatHistory.map((chat: any, idx: number) => {
                      const chatMessages = typeof chat.messages === 'string' 
                        ? JSON.parse(chat.messages)
                        : chat.messages;
                      
                      const firstUserMessage = chatMessages.find((m: Message) => m.role === 'user');
                      const preview = firstUserMessage?.content.substring(0, 50) || 'New conversation';
                      // Only use subject if it's not the default "General Study Help"
                      const hasCustomTitle = chat.subject && chat.subject !== 'General Study Help';
                      const displayTitle = hasCustomTitle ? chat.subject : preview;
                      const isActive = sessionId === chat.id.toString();
                      const messageCount = chatMessages.filter((m: Message) => m.role !== 'system').length;
                      
                      return (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => loadChatSession(chat.id)}
                          className={cn(
                            "w-full text-left p-2.5 sm:p-3 rounded-xl transition-all group relative overflow-hidden cursor-pointer",
                            isActive 
                              ? "bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 shadow-md" 
                              : "bg-card/50 hover:bg-card border border-border hover:border-primary/20 hover:shadow-md"
                          )}
                        >
                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/50" />
                          )}
                          
                          <div className="flex items-start justify-between gap-2 ml-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={cn(
                                    "flex-shrink-0",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                  )}
                                >
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <p className={cn(
                                  "text-xs sm:text-sm font-medium truncate",
                                  isActive ? "text-primary" : "text-foreground"
                                )}>
                                  {displayTitle}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="sm:w-3 sm:h-3"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  <span className="hidden xs:inline">
                                    {new Date(chat.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <span className="xs:hidden">
                                    {new Date(chat.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="sm:w-3 sm:h-3"
                                  >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    <path d="M8 10h.01" />
                                    <path d="M12 10h.01" />
                                    <path d="M16 10h.01" />
                                  </svg>
                                  {messageCount} msg{messageCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            
                            <div className={cn(
                              "flex items-center gap-1 flex-shrink-0 transition-all",
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                              {/* Edit Button */}
                              <button
                                onClick={(e) => startEditingChat(chat.id, displayTitle, e)}
                                className="p-1 hover:bg-primary/10 rounded transition-colors"
                                title="Edit title"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-muted-foreground hover:text-primary sm:w-3.5 sm:h-3.5"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </button>
                              
                              {/* Delete Button */}
                              <button
                                onClick={(e) => deleteChatSession(chat.id, e)}
                                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                                title="Delete chat"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-muted-foreground hover:text-destructive sm:w-3.5 sm:h-3.5"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                              
                              {/* Arrow Icon */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={cn(
                                  "sm:w-4 sm:h-4",
                                  isActive ? "text-primary" : "text-muted-foreground"
                                )}
                              >
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </div>
                          </div>
                          
                          {/* Edit Mode */}
                          {editingChatId === chat.id && (
                            <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border rounded bg-background"
                                placeholder="Enter chat title..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveEditedTitle(chat.id, e as any);
                                  } else if (e.key === 'Escape') {
                                    cancelEditing(e as any);
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => saveEditedTitle(chat.id, e)}
                                className="p-1 hover:bg-primary/10 rounded text-primary"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 hover:bg-destructive/10 rounded text-destructive"
                                title="Cancel"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <Bot className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No chat history yet</p>
                    <p className="text-xs text-muted-foreground">
                      Start a conversation to see it here
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-3 sm:p-4 border-t bg-gradient-to-r from-muted/30 to-muted/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    Total Conversations
                  </span>
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                    {Array.isArray(chatHistory) ? chatHistory.length : 0}
                  </span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}