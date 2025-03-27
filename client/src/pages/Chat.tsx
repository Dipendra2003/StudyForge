import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/App";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Welcome to Jadoo AI Assistant. How can I help you with your studies today?'
    }
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch chat history
  const { data: chatHistory } = useQuery({
    queryKey: ['/api/chat/history'],
    enabled: !!user,
  });

  // Set up chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content: data.response,
        },
      ]);
      
      // Invalidate chat history query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/chat/history'] });
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
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to API
    chatMutation.mutate(input);
    
    // Clear input
    setInput("");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">AI Study Assistant</h1>
        
        <div className="flex flex-col h-[70vh]">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 rounded-lg border">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <Card
                  className={`p-4 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'system'
                      ? 'bg-muted'
                      : 'bg-secondary'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </Card>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <Card className="p-4 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Card>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any study question..."
              className="flex-1 resize-none"
              rows={2}
              maxLength={1000}
              disabled={chatMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={chatMutation.isPending || !input.trim()}
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}