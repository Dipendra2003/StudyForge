import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User as UserIcon, Sparkles, Copy, Check, Menu, X, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPostFormData, apiDelete, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import MessageActionBar from "@/components/chat/MessageActionBar";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import MessageFormatter from "@/components/chat/MessageFormatter";
import FilePreviewChips from "@/components/chat/FilePreviewChips";
import AttachmentMenu from "@/components/chat/AttachmentMenu";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  inlineData?: { data: string; mimeType: string; fileUrl?: string }[];
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

// Helper function to extract and parse <ACTION> tags
const extractAction = (content: string) => {
  const match = content.match(/<ACTION>([\s\S]*?)<\/ACTION>/);
  if (match) {
    try {
      const action = JSON.parse(match[1]);
      const cleanContent = content.replace(/<ACTION>[\s\S]*?<\/ACTION>/g, '').trim();
      return { cleanContent, action };
    } catch (e) {

    }
  }
  return { cleanContent: content, action: null };
};

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  
  // Persist active session ID across page refreshes with 30 minute timeout
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const savedSessionId = sessionStorage.getItem('activeChatSessionId');
    const lastActivity = sessionStorage.getItem('activeChatLastActivity');
    
    if (savedSessionId && lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10);
      const currentTime = Date.now();
      const thirtyMinutesInMillis = 30 * 60 * 1000; // 30 minutes
      
      // If inactive for more than 30 minutes, clear session
      if (currentTime - lastActivityTime > thirtyMinutesInMillis) {
        sessionStorage.removeItem('activeChatSessionId');
        sessionStorage.removeItem('activeChatLastActivity');
        return null;
      }
      return savedSessionId;
    }
    return savedSessionId;
  });
  
  // Generate personalized initial greeting
  const getInitialMessage = (): Message => ({
    role: 'system',
    content: getPersonalizedGreeting(user),
    timestamp: new Date()
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const initialMessages: Message[] = [getInitialMessage()];
    const documentContext = sessionStorage.getItem('documentChatContext');
    if (documentContext) {
      initialMessages.push({
        role: 'system',
        content: "📄 **Document Context Loaded**\nI've loaded the document you selected. You can now ask me any questions about it, request specific summaries, or have me test your knowledge on its contents!",
        timestamp: new Date()
      });
    }
    return initialMessages;
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Sidebar closed by default
  const [showQuickActions, setShowQuickActions] = useState(false); // Quick actions hidden by default
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [lightboxImage, setLightboxImage] = useState<{src: string, alt: string} | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save active session ID and update last activity to sessionStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('activeChatSessionId', sessionId);
      sessionStorage.setItem('activeChatLastActivity', Date.now().toString());
    } else {
      sessionStorage.removeItem('activeChatSessionId');
      sessionStorage.removeItem('activeChatLastActivity');
    }
  }, [sessionId, messages]);

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
  const loadChatSession = async (chatId: number, showToast = true) => {
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
        inlineData: msg.inlineData || undefined,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
      }));
      
      setMessages(messagesWithDates);
      setSessionId(chatId.toString());
      
      if (showToast) {
        toast({
          title: "Chat loaded",
          description: "Previous conversation loaded successfully",
        });
      }
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
    sessionStorage.removeItem('documentChatContext');
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].type === "application/pdf") {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    
    if (pastedFiles.length > 0) {
      e.preventDefault();
      setFiles(prev => {
        const newFiles = [...prev, ...pastedFiles];
        return newFiles.slice(0, 10); // Max 10 files
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    if (droppedFiles.length > 0) {
      setFiles(prev => {
        const newFiles = [...prev, ...droppedFiles];
        return newFiles.slice(0, 10);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent | string) => {
    let currentInput = input.trim();
    if (typeof e === 'string') {
      currentInput = e.trim();
    } else if (e) {
      e.preventDefault();
    }
    
    if ((!currentInput && files.length === 0) || isStreaming || isSubmitting) return;

    setIsSubmitting(true);
    const currentFiles = [...files];
    const inlineData: { data: string, mimeType: string, fileUrl?: string }[] = [];
    
    // Process files for instant preview in chat bubble
    for (const file of currentFiles) {
      if (file.type.startsWith('image/')) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.readAsDataURL(file);
        });
        if (base64) {
          inlineData.push({ data: base64, mimeType: file.type });
        }
      } else {
        inlineData.push({ data: '', mimeType: file.type, fileUrl: URL.createObjectURL(file) }); // PDF placeholder
      }
    }

    // Build smart message content
    const hasPdf = currentFiles.some(f => f.type === 'application/pdf');
    const pdfNames = currentFiles.filter(f => f.type === 'application/pdf').map(f => f.name);
    let userMessageContent = currentInput;
    if (!userMessageContent && currentFiles.length > 0) {
      // Auto-generate a meaningful prompt when user only attaches files
      if (hasPdf) {
        userMessageContent = `Please analyze and explain this PDF: ${pdfNames.join(', ')}`;
      } else {
        userMessageContent = `What is this?`;
      }
    }
    
    const userMessage: Message = {
      role: 'user',
      content: userMessageContent,
      ...(inlineData.length > 0 ? { inlineData } : {}),
      timestamp: new Date()
    };
    
    // Show a loading message while AI processes (especially for PDFs which take time)
    const loadingText = hasPdf ? '📄 Analyzing your PDF document...' : '';
    setMessages(prev => [...prev, userMessage, { role: 'assistant', content: loadingText, timestamp: new Date() }]);
    setIsTyping(!hasPdf); // For PDFs, the loading text acts as the indicator
    // isStreaming will be set to true once the network request succeeds and stream starts
    
    setInput("");
    setFiles([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const documentContext = sessionStorage.getItem('documentChatContext');
      const formData = new FormData();
      formData.append('message', userMessageContent);
      if (sessionId) formData.append('sessionId', sessionId);
      formData.append('subject', documentContext ? 'Document Analysis' : 'General Study Help');
      if (documentContext) formData.append('documentContext', documentContext);
      
      currentFiles.forEach(file => {
        formData.append('files', file);
      });

      // Save to local IndexedDB (user request)
      if (sessionId) {
        try {
          const { saveAttachmentLocally } = await import('@/lib/storage');
          for (const file of currentFiles) {
            await saveAttachmentLocally(sessionId, file);
          }
        } catch (e) {

        }
      }
      
      const response = await apiPostFormData('/api/chat', formData, {
        'Accept': 'text/event-stream',
        'x-no-compression': 'true'
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setIsTyping(false); // Hide typing indicator since streaming starts
      setIsStreaming(true); // Now we are actually streaming text

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No response stream");

      let done = false;
      let streamedResponse = "";
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          
          // Keep the last, potentially incomplete chunk in the buffer
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                
                if (data.error) {
                  throw new Error(`STREAM_ERROR:${data.error}`);
                }
                
                if (data.content) {
                  streamedResponse += data.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: streamedResponse,
                      timestamp: new Date()
                    };
                    return newMessages;
                  });
                }
                
                if (data.done) {
                  let currentChatId = sessionId;
                  if (data.chatHistory && !sessionId) {
                    currentChatId = data.chatHistory.id.toString();
                    setSessionId(currentChatId);
                  }
                  queryClient.invalidateQueries({ queryKey: ['/api/chat/history'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/attachments'] });
                  refetchHistory();
                  
                  if (currentChatId) {
                    // Silently reload chat history to replace local blob URLs with permanent Cloudinary URLs
                    loadChatSession(parseInt(currentChatId), false);
                  }
                }
              } catch (e: any) {
                if (e.message && e.message.startsWith('STREAM_ERROR:')) {
                  throw new Error(e.message.replace('STREAM_ERROR:', ''));
                }
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
        scrollToBottom();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get a response",
        variant: "destructive",
      });
      // Remove the empty assistant message if it failed completely
      setMessages(prev => {
        if (prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
      setIsTyping(false);
      setIsSubmitting(false);
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
      <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card/80 backdrop-blur-md flex-shrink-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
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
                
                {/* AI Badge */}
                <div 
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
                  title="AI Powered Assistant"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">AI</span>
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
        <div className="flex-1 min-h-0 overflow-y-auto relative scroll-smooth" ref={messagesContainerRef}>
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
                        handleSubmit(suggestion);
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
              {messages.map((message, index) => {

                return (
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
                        {message.inlineData && message.inlineData.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {message.inlineData.map((file, i) => (
                              <div key={i} className="relative rounded overflow-hidden border bg-black/5 max-w-[200px] max-h-[200px]">
                                {file.mimeType.startsWith('image/') ? (
                                  <img 
                                    src={`data:${file.mimeType};base64,${file.data}`} 
                                    alt="Uploaded attachment" 
                                    className="object-contain w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxImage({ src: `data:${file.mimeType};base64,${file.data}`, alt: "Uploaded attachment" })}
                                  />
                                ) : file.fileUrl && !file.fileUrl.startsWith('blob:') ? (
                                    <div 
                                      className="relative w-[120px] h-[160px] group-hover:opacity-90 transition-opacity rounded overflow-hidden border bg-white cursor-pointer"
                                      onClick={() => setPdfPreviewUrl(file.fileUrl!)}
                                    >
                                      <img 
                                        src={`${file.fileUrl}${file.fileUrl.includes('?') ? '&' : '?'}preview=true`}
                                        alt="PDF Document"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const img = e.currentTarget;
                                          const retries = parseInt(img.dataset.retries || '0');
                                          if (retries < 3) {
                                            img.dataset.retries = (retries + 1).toString();
                                            setTimeout(() => {
                                              img.src = `${file.fileUrl}${file.fileUrl!.includes('?') ? '&' : '?'}preview=true&r=${retries + 1}`;
                                            }, 2500); // Wait 2.5s for Cloudinary to generate the thumbnail
                                          } else {
                                            img.style.display = 'none';
                                            const parent = img.parentElement;
                                            if (parent && !parent.querySelector('.pdf-fallback')) {
                                              const fallback = document.createElement('div');
                                              fallback.className = 'pdf-fallback absolute inset-0 flex flex-col items-center justify-center bg-primary/10 text-primary';
                                              fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text mb-2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg><span class="font-semibold text-xs text-center w-full truncate px-2">PDF Document</span>';
                                              parent.appendChild(fallback);
                                            }
                                          }
                                        }}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 pointer-events-none">
                                        <div className="absolute bottom-2 right-2 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded shadow flex items-center">
                                          <FileText className="h-3 w-3 mr-1" /> PDF
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={cn(
                                      "flex flex-col items-center justify-center p-4 min-w-[120px] min-h-[80px] cursor-pointer",
                                      message.role === 'user' 
                                        ? "bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors" 
                                        : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                                    )}
                                    onClick={() => {
                                      if (file.fileUrl) {
                                        setPdfPreviewUrl(file.fileUrl);
                                      } else {
                                        toast({
                                          title: "Cannot open PDF",
                                          description: "The PDF URL is not available. Please try viewing it in the Media Gallery.",
                                          variant: "default"
                                        });
                                      }
                                    }}>
                                      <FileText className="h-8 w-8 mb-2" />
                                      <span className="text-xs font-medium">PDF Document</span>
                                      <span className="text-[10px] opacity-80 mt-1 max-w-[100px] truncate text-center" title="Document">Attachment</span>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(() => {
                          const { cleanContent, action } = extractAction(message.content);
                          
                          // Show animated dots for empty assistant messages (e.g. waiting for stream)
                          if (message.role === 'assistant' && !cleanContent) {
                            return (
                              <div className="flex items-center space-x-1.5 h-6 px-2">
                                <motion.div className="w-2 h-2 bg-current rounded-full opacity-70" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                                <motion.div className="w-2 h-2 bg-current rounded-full opacity-70" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                                <motion.div className="w-2 h-2 bg-current rounded-full opacity-70" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                              </div>
                            );
                          }
                          
                          return (
                            <>
                              {message.role === 'assistant' ? (
                                <MessageFormatter content={cleanContent} />
                              ) : (
                                <div className="whitespace-pre-wrap break-words">{cleanContent}</div>
                              )}
                              
                              {action && (
                                <div className="mt-4 pt-4 border-t border-border/50">
                                  <Button 
                                    onClick={() => {
                                      const path = action.type === 'quiz' ? '/quiz-mode' : '/flashcards';
                                      setLocation(`${path}?q=${encodeURIComponent(action.query || action.topic)}`);
                                    }}
                                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2"
                                  >
                                    <Sparkles className="h-4 w-4" />
                                    Launch {action.type === 'quiz' ? 'Quiz' : 'Flashcards'} on {action.topic}
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
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
              );
              })}
            </AnimatePresence>



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

        {/* Input Area - Fixed at bottom */}
        <div className="border-t bg-card/80 backdrop-blur-md flex-shrink-0 z-10">
          <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 max-w-4xl">
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
                        handleSubmit(quick.action);
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
            
            <form onSubmit={handleSubmit} className="relative" onDragOver={handleDragOver} onDrop={handleDrop}>
              {/* File Preview */}
              <FilePreviewChips files={files} onRemove={(index) => setFiles(prev => prev.filter((_, i) => i !== index))} />

              <div className="relative flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl border border-border bg-background shadow-xs hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <AttachmentMenu 
                  onSelectFiles={(selectedFiles) => {
                    if (selectedFiles) {
                      const newFiles = Array.from(selectedFiles);
                      setFiles(prev => [...prev, ...newFiles].slice(0, 10));
                    }
                  }}
                />
                <Textarea
                  ref={textareaRef}
                  value={input}
                  disabled={isSubmitting}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Ask any study question..."
                  className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[38px] max-h-[160px] py-2 px-2 text-sm leading-relaxed overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  rows={1}
                  maxLength={10000}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                  }}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all flex-shrink-0 mb-0.5 shadow-xs flex items-center justify-center"
                  disabled={isStreaming || isTyping || isSubmitting || (!input.trim() && files.length === 0)}
                >
                  {isStreaming || isTyping || isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {input.length}/10000 characters
                </p>
                <p className="hidden sm:block text-[11px] sm:text-xs text-muted-foreground">
                  Press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">Shift</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">Enter</kbd> for new line
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
      {/* Full Screen Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* PDF Viewer Modal */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => !open && setPdfPreviewUrl(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-md flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              <span className="truncate max-w-xl">Document Viewer</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setPdfPreviewUrl(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="w-full h-full flex-grow relative bg-black/5">
            {pdfPreviewUrl && (
              <iframe 
                src={pdfPreviewUrl}
                className="absolute inset-0 w-full h-full border-0"
                title="Document Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}