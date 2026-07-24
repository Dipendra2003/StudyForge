import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, File, Trash2, Eye, Sparkles, Upload, CheckCircle2, Clock, TrendingUp, Download, Copy, BookOpen, Zap, AlertCircle, FileType, FileDown, Brain, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { downloadAsTXT, downloadAsPDF, downloadAsDOCX } from "@/utils/downloadUtils";
import { BulkGenerateDialog } from "@/components/BulkGenerateDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface Summary {
  id: number;
  userId: number;
  documentId: number;
  originalText: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    readingTime: number;
    difficultyLevel: 'Easy' | 'Medium' | 'Hard';
    compression: number;
    status: string;
    insights?: string[];
    applications?: string[];
    relatedLinks?: Array<{ title: string; url: string }>;
  };
}

export default function DocumentSummarization() {
  // Persist active tab across page refreshes
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('docSummaryActiveTab') || "create";
  });
  
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [documentText, setDocumentText] = useState<string>("");
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [summaryType, setSummaryType] = useState<string>("concise");
  const [isTextReady, setIsTextReady] = useState<boolean>(false);
  const [savedDocumentId, setSavedDocumentId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showBulkGenerateDialog, setShowBulkGenerateDialog] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Save active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('docSummaryActiveTab', activeTab);
  }, [activeTab]);

  // Create document
  const createDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return apiRequest<{ document: { id: number; title: string; content: string } }>("/api/documents", {
        method: "POST",
        data,
      });
    },
    onSuccess: (data) => {
      setSavedDocumentId(data.document.id);
      setIsTextReady(true);
      toast({
        title: "Document saved successfully",
        description: "Your document has been saved and is ready for summarization.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving document",
        description: "There was an error saving your document. Please try again.",
        variant: "destructive",
      });
      console.error("Save error:", error);
    },
  });

  // Fetch all summaries
  const { data: summariesData, isLoading: summariesLoading } = useQuery({
    queryKey: ["/api/summaries"],
    queryFn: () => apiRequest<{ summaries: Summary[] }>("/api/summaries"),
  });

  // Create summary (generate and save to database)
  const createSummaryMutation = useMutation({
    mutationFn: async (data: { documentId?: number; originalText: string; type: string }) => {
      return apiRequest<{ summary: Summary }>("/api/summaries", {
        method: "POST",
        data,
      });
    },
    onSuccess: (data) => {
      // Validate that we received a valid summary
      if (!data.summary || !data.summary.summary || data.summary.summary.trim().length === 0) {
        toast({
          title: "⚠️ Empty Summary Generated",
          description: "The AI returned an empty summary. Please try again with different text or summary type.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      setCurrentSummary(data.summary);
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      toast({
        title: "✅ Summary created successfully!",
        description: `Generated ${data.summary.summary.length} characters with ${data.summary.keyPoints?.length || 0} key points.`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      console.error("Summarization error:", error);
      
      // Extract error message from response
      const errorMessage = (error?.response?.data?.error || error?.message || "").toLowerCase();
      const errorTitle = error?.response?.data?.message || "Error generating summary";
      const status = error?.response?.status;
      
      // Check if it's a quota error (check status code and message content)
      if (status === 429 || 
          errorMessage.includes('quota') || 
          errorMessage.includes('limit') ||
          errorMessage.includes('too many requests') ||
          errorTitle.toLowerCase().includes('limit')) {
        toast({
          title: "⚠️ Daily Limit Reached",
          description: "You've used all 50 free AI summaries for today. The limit resets in 24 hours. Try again tomorrow!",
          variant: "destructive",
          duration: 10000,
        });
      } else if (errorMessage.includes('too long') || errorMessage.includes('maximum length')) {
        toast({
          title: "Text Too Long",
          description: "Your document exceeds the maximum length. Please reduce the text and try again.",
          variant: "destructive",
          duration: 6000,
        });
      } else if (errorMessage.includes('too short') || errorMessage.includes('at least')) {
        toast({
          title: "Text Too Short",
          description: "Please provide at least 50 characters of text to generate a meaningful summary.",
          variant: "destructive",
          duration: 6000,
        });
      } else if (errorMessage.includes('empty') || errorMessage.includes('no response')) {
        toast({
          title: "Empty Response",
          description: "The AI service returned an empty response. Please try again or use a different summary type.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: errorTitle,
          description: error?.response?.data?.error || error?.message || "There was an error summarizing your document. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    },
  });

  // Delete summary
  const deleteSummaryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/summaries/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      toast({
        title: "Summary deleted",
        description: "The summary has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting summary",
        description: "There was an error deleting the summary. Please try again.",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    },
  });

  const handleSaveDocument = async () => {
    if (!documentText || !documentTitle) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your document.",
        variant: "destructive",
      });
      return;
    }

    createDocumentMutation.mutate({
      title: documentTitle,
      content: documentText,
    });
  };

  const handleSummarize = () => {
    if (!documentText) {
      toast({
        title: "No text to summarize",
        description: "Please enter text to summarize.",
        variant: "destructive",
      });
      return;
    }

    // No need to truncate - backend handles chunking automatically
    // Just warn if text is very long
    if (documentText.length > 50000) {
      toast({
        title: "Large document",
        description: `Your document is ${documentText.length} characters. Processing may take longer.`,
        variant: "default",
      });
    }

    createSummaryMutation.mutate({
      documentId: savedDocumentId || undefined,
      originalText: documentText,
      type: summaryType,
    });
  };

  const handleViewSummary = (summary: Summary) => {
    setLocation(`/summary/${summary.id}`);
  };

  const handleDeleteSummary = (id: number) => {
    if (confirm("Are you sure you want to delete this summary?")) {
      deleteSummaryMutation.mutate(id);
    }
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Summary has been copied to your clipboard.",
    });
  };

  // Download handlers for different formats
  const handleDownloadTXT = (summary: Summary) => {
    try {
      downloadAsTXT(summary);
      toast({
        title: "✅ TXT Downloaded",
        description: "Your summary has been downloaded as a text file.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the TXT file.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = (summary: Summary) => {
    try {
      downloadAsPDF(summary);
      toast({
        title: "✅ PDF Downloaded",
        description: "Your summary has been downloaded as a PDF file.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDOCX = async (summary: Summary) => {
    try {
      await downloadAsDOCX(summary);
      toast({
        title: "✅ Word Downloaded",
        description: "Your summary has been downloaded as a Word document.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the Word file.",
        variant: "destructive",
      });
    }
  };

  // Legacy function for backward compatibility
  const handleDownloadSummary = (summary: Summary) => {
    handleDownloadTXT(summary);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let text = '';
      const fileName = file.name.toLowerCase();
      
      // Handle different file types
      if (fileName.endsWith('.txt') || file.type === 'text/plain') {
        // Plain text file - client-side processing
        text = await file.text();
      } else if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        // PDF file - server-side processing
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await apiRequest<{ text: string; fileName: string; textLength: number; wordCount: number }>('/api/extract-text', {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - browser will set it with boundary for FormData
          });
          
          text = response.text;
          toast({
            title: "PDF processed successfully",
            description: `Extracted ${response.wordCount} words from ${response.fileName}`,
          });
        } catch (extractError: any) {
          toast({
            title: "PDF extraction failed",
            description: extractError.message || "Could not extract text from PDF. It may be encrypted or contain only images.",
            variant: "destructive",
          });
          setIsUploading(false);
          event.target.value = '';
          return;
        }
      } else if (
        fileName.endsWith('.doc') || 
        fileName.endsWith('.docx') || 
        file.type === 'application/msword' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // Word document - server-side processing
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await apiRequest<{ text: string; fileName: string; textLength: number; wordCount: number }>('/api/extract-text', {
            method: 'POST',
            body: formData,
          });
          
          text = response.text;
          toast({
            title: "Word document processed successfully",
            description: `Extracted ${response.wordCount} words from ${response.fileName}`,
          });
        } catch (extractError: any) {
          toast({
            title: "Word extraction failed",
            description: extractError.message || "Could not extract text from Word document. It may be corrupted or in an unsupported format.",
            variant: "destructive",
          });
          setIsUploading(false);
          event.target.value = '';
          return;
        }
      } else if (fileName.endsWith('.rtf') || file.type === 'application/rtf') {
        // RTF file - client-side processing
        text = await file.text();
        // Basic RTF cleanup (remove RTF control words)
        text = text.replace(/\\[a-z]+\d*\s?/g, '').replace(/[{}]/g, '');
      } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        // Markdown file - client-side processing
        text = await file.text();
      } else if (
        fileName.endsWith('.html') || 
        fileName.endsWith('.htm') || 
        file.type === 'text/html'
      ) {
        // HTML file - client-side processing (strip tags)
        const htmlText = await file.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        text = tempDiv.textContent || tempDiv.innerText || '';
      } else {
        // Unsupported file type
        toast({
          title: "Unsupported file type",
          description: "Supported formats: .txt, .md, .html, .rtf, .pdf, .doc, .docx",
          variant: "destructive",
        });
        setIsUploading(false);
        event.target.value = '';
        return;
      }

      // Clean up the text
      text = text.trim();
      
      if (!text || text.length < 10) {
        toast({
          title: "No text found",
          description: "The file appears to be empty or couldn't be read properly.",
          variant: "destructive",
        });
        setIsUploading(false);
        event.target.value = '';
        return;
      }

      setDocumentText(text);
      setDocumentTitle(file.name.replace(/\.[^/.]+$/, ""));
      setIsTextReady(true);
      
      toast({
        title: "File uploaded successfully",
        description: `Extracted ${text.length} characters from ${file.name}`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error reading your file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be uploaded again
      event.target.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                  Document Summarization
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI-powered intelligent document analysis
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-primary">
                  {summariesData?.summaries?.length || 0} Summaries
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <Card className="border-2 hover:border-blue-300 transition-all shadow-md hover:shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50/50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 shadow-md">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{summariesData?.summaries?.length || 0}</p>
                      <p className="text-xs text-muted-foreground font-medium">Total Summaries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-green-300 transition-all shadow-md hover:shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-green-50/50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 shadow-md">
                      <Zap className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{savedDocumentId ? '1' : '0'}</p>
                      <p className="text-xs text-muted-foreground font-medium">Active Document</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-purple-300 transition-all shadow-md hover:shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50/50 to-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 shadow-md">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{documentText.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Characters</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-auto p-1">
            <TabsTrigger value="create" className="text-sm sm:text-base py-2 sm:py-2.5">
              <Upload className="h-4 w-4 mr-2" />
              Create Summary
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-sm sm:text-base py-2 sm:py-2.5">
              <FileText className="h-4 w-4 mr-2" />
              Saved Summaries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8"
            >
          <Card className="col-span-1 border-2 hover:border-primary/50 transition-all shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="space-y-1 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
                <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-semibold">Document Content</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Enter your document title and paste the text you want to summarize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileType className="h-4 w-4 text-primary" />
                    Upload Document (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".txt,.rtf,.md,.markdown,.html,.htm,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="border-2 focus:border-violet-500 transition-colors cursor-pointer rounded-xl w-full h-auto py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-violet-500 file:to-purple-500 file:text-white hover:file:from-violet-600 hover:file:to-purple-600 file:transition-all file:shadow-md hover:file:shadow-lg"
                    />
                    {isUploading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="font-medium text-muted-foreground">Supported:</span>
                      <Badge variant="secondary" className="text-xs h-5 bg-green-500/10 text-green-700 border-green-200">TXT</Badge>
                      <Badge variant="secondary" className="text-xs h-5 bg-green-500/10 text-green-700 border-green-200">PDF</Badge>
                      <Badge variant="secondary" className="text-xs h-5 bg-green-500/10 text-green-700 border-green-200">DOC/DOCX</Badge>
                      <Badge variant="secondary" className="text-xs h-5 bg-green-500/10 text-green-700 border-green-200">MD</Badge>
                      <Badge variant="secondary" className="text-xs h-5 bg-green-500/10 text-green-700 border-green-200">HTML</Badge>
                      <Badge variant="secondary" className="text-xs h-5 bg-green-500/10 text-green-700 border-green-200">RTF</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      Max 10MB • All formats fully supported
                    </p>
                  </div>
                </div>

                {/* Info Alert for File Formats */}
                <Alert className="border-green-200 bg-green-50/50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-sm font-medium text-green-900">All Formats Supported!</AlertTitle>
                  <AlertDescription className="text-xs text-green-700">
                    <strong>Instant processing:</strong> TXT, Markdown, HTML, RTF
                    <br />
                    <strong>Server extraction:</strong> PDF and Word documents (may take a few seconds)
                  </AlertDescription>
                </Alert>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document-title" className="text-sm font-medium flex items-center gap-2">
                    Document Title
                    {documentTitle && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </Label>
                  <Input
                    id="document-title"
                    placeholder="Enter a title for your document..."
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="border-2 focus:border-violet-500 transition-colors rounded-xl shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-text" className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Document Text
                      {documentText && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </span>
                    <span className={cn(
                      "text-xs font-medium transition-colors",
                      documentText.length === 0 ? "text-muted-foreground" :
                      documentText.length < 100 ? "text-yellow-500" :
                      documentText.length < 500 ? "text-blue-500" :
                      "text-green-500"
                    )}>
                      {documentText.length} characters
                      {documentText.length > 0 && ` • ${Math.ceil(documentText.split(/\s+/).length)} words`}
                    </span>
                  </Label>
                  <Textarea
                    id="document-text"
                    placeholder="Paste your text here to summarize..."
                    className="min-h-[250px] sm:min-h-[300px] border-2 focus:border-violet-500 transition-colors resize-y rounded-xl shadow-sm font-mono text-sm whitespace-pre-wrap"
                    value={documentText}
                    onChange={(e) => {
                      setDocumentText(e.target.value);
                      setIsTextReady(!!e.target.value);
                    }}
                  />
                  {documentText.length > 0 && (
                    <div className="space-y-2">
                      <Progress 
                        value={Math.min((documentText.length / 50000) * 100, 100)} 
                        className={cn(
                          "h-1.5",
                          documentText.length > 50000 && "bg-red-200"
                        )}
                      />
                      <p className={cn(
                        "text-xs text-right",
                        documentText.length > 50000 ? "text-red-500 font-medium" : "text-muted-foreground"
                      )}>
                        {documentText.length < 100 ? "Add more text for better results" :
                         documentText.length < 500 ? "Good length for summarization" :
                         documentText.length <= 10000 ? "Excellent! Ready for detailed analysis" :
                         documentText.length <= 50000 ? "Large document - processing may take longer" :
                         `⚠️ Very large document (${documentText.length.toLocaleString()} characters)`}
                      </p>
                      {documentText.length > 50000 && (
                        <Alert className="border-yellow-200 bg-yellow-50/50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="text-sm font-medium text-yellow-900">Very Large Document</AlertTitle>
                          <AlertDescription className="text-xs text-yellow-700">
                            Your document has {documentText.length.toLocaleString()} characters. Processing will take longer. Consider breaking it into smaller sections if you encounter issues.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveDocument} 
                    disabled={!documentText || !documentTitle || createDocumentMutation.isPending}
                    className={cn(
                      "flex-1 transition-all rounded-xl shadow-md hover:shadow-lg font-semibold",
                      savedDocumentId 
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white" 
                        : "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                    )}
                    size="lg"
                  >
                    {createDocumentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : savedDocumentId ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Document Saved
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Save Document
                      </>
                    )}
                  </Button>
                  {(documentText || documentTitle) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setDocumentText("");
                              setDocumentTitle("");
                              setSavedDocumentId(null);
                              setIsTextReady(false);
                              setCurrentSummary(null);
                            }}
                            className="px-4"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear all</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 border-2 hover:border-primary/50 transition-all shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="space-y-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-violet-500/10 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold">Summarization Settings</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Configure how you want your document to be summarized.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="summary-type" className="text-sm font-medium flex items-center gap-2">
                  Summary Type
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Choose how you want your document summarized based on your needs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <select
                  id="summary-type"
                  className="w-full p-3 border-2 rounded-xl bg-background hover:border-violet-400 focus:border-violet-500 transition-colors cursor-pointer shadow-sm font-medium"
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                >
                  <option value="concise">✨ Concise (Key Points)</option>
                  <option value="detailed">📚 Detailed (Comprehensive)</option>
                  <option value="eli5">🎯 ELI5 (Simplified Explanation)</option>
                  <option value="academic">🎓 Academic (Scholarly Format)</option>
                </select>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-violet-50/50 to-purple-50/50 border border-violet-100 shadow-sm">
                <Label className="text-sm font-medium flex items-center gap-2 text-violet-700">
                  <Clock className="h-4 w-4" />
                  Summary Length
                </Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Shorter</span>
                    <span className="font-semibold text-violet-600">Balanced</span>
                    <span>Longer</span>
                  </div>
                  <Progress value={60} className="h-2.5 bg-violet-100" />
                </div>
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm font-medium">AI Enhancement</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Our AI will extract key insights, identify main themes, and generate relevant keywords automatically.
                </AlertDescription>
              </Alert>

              <Alert className="border-yellow-200 bg-yellow-50/50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-sm font-medium text-yellow-900">Free Tier Limit</AlertTitle>
                <AlertDescription className="text-xs text-yellow-700">
                  You have 50 free AI summaries per day. The limit resets every 24 hours. If you hit the limit, please try again tomorrow.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSummarize}
                className="w-full mt-4 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0 text-white font-semibold rounded-xl"
                size="lg"
                disabled={!isTextReady || createSummaryMutation.isPending}
              >
                {createSummaryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating AI Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    🤖 Generate AI Summary
                  </>
                )}
              </Button>

              {/* Loading Progress Indicator */}
              {createSummaryMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-2"
                >
                  <Alert className="border-blue-200 bg-blue-50/50">
                    <Brain className="h-4 w-4 text-blue-600 animate-pulse" />
                    <AlertTitle className="text-sm font-medium text-blue-900">AI is analyzing your document...</AlertTitle>
                    <AlertDescription className="text-xs text-blue-700">
                      This may take 10-30 seconds depending on document length. Please wait.
                    </AlertDescription>
                  </Alert>
                  <Progress value={undefined} className="h-2" />
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {currentSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mt-6 sm:mt-8 border-2 border-violet-200 shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-500/15 via-purple-500/15 to-indigo-500/15 border-b border-violet-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30">
                          <CheckCircle2 className="h-5 w-5 text-violet-600" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-bold">Generated Summary</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        Here's the {summaryType} summary of your document.
                      </CardDescription>
                      {currentSummary.metadata && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            <Clock className="h-3 w-3 mr-1" />
                            ⏱ {currentSummary.metadata.readingTime} min read
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              currentSummary.metadata.difficultyLevel === 'Easy' ? 'bg-green-50 border-green-300 text-green-700' :
                              currentSummary.metadata.difficultyLevel === 'Medium' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                              'bg-red-50 border-red-300 text-red-700'
                            }`}
                          >
                            📊 {currentSummary.metadata.difficultyLevel}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                            📉 {currentSummary.metadata.compression}% compression
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            ✅ {currentSummary.metadata.status}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md rounded-full px-4 py-1.5">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generated
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        Summary
                      </h3>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopySummary(currentSummary.summary)}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy summary</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    {/* Validation: Check if summary is empty or too short */}
                    {(!currentSummary.summary || currentSummary.summary.trim().length < 20) ? (
                      <Alert className="border-red-200 bg-red-50/50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle className="text-sm font-medium text-red-900">Empty or Invalid Summary</AlertTitle>
                        <AlertDescription className="text-xs text-red-700">
                          The AI generated an empty or incomplete summary. Please try again with a different summary type or check your document text.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-xl border-2 border-violet-100 whitespace-pre-wrap text-sm sm:text-base leading-relaxed shadow-inner">
                        {currentSummary.summary}
                      </div>
                    )}
                  </motion.div>
                  
                  {currentSummary.keyPoints && currentSummary.keyPoints.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Key Points
                      </h3>
                      <ul className="space-y-2">
                        {currentSummary.keyPoints.map((point, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex items-start gap-3 p-3 sm:p-4 bg-gradient-to-r from-violet-50/80 to-transparent rounded-xl border border-violet-200 hover:border-violet-400 transition-all hover:shadow-md"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white mt-0.5 shadow-md">
                              {index + 1}
                            </div>
                            <span className="text-sm sm:text-base">{point}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                  
                  {currentSummary.keywords && currentSummary.keywords.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Keywords
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {currentSummary.keywords.map((keyword, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                          >
                            <Badge 
                              variant="secondary" 
                              className="px-3 py-1.5 text-sm bg-gradient-to-r from-violet-100 to-purple-100 hover:from-violet-200 hover:to-purple-200 border border-violet-300 transition-all cursor-default rounded-full shadow-sm"
                            >
                              {keyword}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentSummary.metadata?.insights && currentSummary.metadata.insights.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        💡 Insights
                      </h3>
                      <div className="space-y-3">
                        {currentSummary.metadata.insights.map((insight, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border border-blue-200 hover:border-blue-400 transition-all hover:shadow-md"
                          >
                            <p className="text-sm text-blue-900">{insight}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentSummary.metadata?.applications && currentSummary.metadata.applications.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5 text-primary" />
                        ⚙️ Applications / Use Cases
                      </h3>
                      <div className="space-y-3">
                        {currentSummary.metadata.applications.map((app, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className="p-4 bg-gradient-to-r from-green-50 to-transparent rounded-xl border border-green-200 hover:border-green-400 transition-all hover:shadow-md"
                          >
                            <p className="text-sm text-green-900">{app}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentSummary.metadata?.relatedLinks && currentSummary.metadata.relatedLinks.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        🔗 Related Topics / Useful Links
                      </h3>
                      <div className="space-y-2">
                        {currentSummary.metadata.relatedLinks.map((link, index) => (
                          <motion.a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + index * 0.05 }}
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all group"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                              <BookOpen className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-purple-900 group-hover:text-purple-700 truncate">
                                {link.title}
                              </p>
                              <p className="text-xs text-purple-600 truncate">{link.url}</p>
                            </div>
                            <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </motion.a>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="pt-4 border-t"
                  >
                    <Alert className="border-primary/20 bg-primary/5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-sm font-medium">🧾 AI Transparency Note</AlertTitle>
                      <AlertDescription className="text-xs text-muted-foreground">
                        ⚙️ Generated using AI summarization logic. Output style adapts dynamically to the selected Summary Type. All external links provided are for <strong>learning and reference purposes only</strong>.
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                </CardContent>
                <CardFooter className="flex-col gap-4 bg-gradient-to-r from-violet-50/30 to-purple-50/30 border-t border-violet-100">
                  {/* Download Section */}
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-900">Download Summary</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTXT(currentSummary)}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        📄 Download TXT
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(currentSummary)}
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <File className="h-4 w-4 mr-2" />
                        🧾 Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDOCX(currentSummary)}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <FileType className="h-4 w-4 mr-2" />
                        📝 Download Word
                      </Button>
                    </div>
                  </div>
                  
                  {/* Generate Flashcards Section */}
                  <div className="w-full space-y-3 pt-2 border-t border-violet-100">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-900">Study Tools</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => setShowBulkGenerateDialog(true)}
                        className="flex-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:via-rose-600 hover:to-red-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        🧠 Generate Flashcards
                      </Button>
                      <Button
                        onClick={() => {
                          sessionStorage.setItem('documentChatContext', currentSummary.originalText || currentSummary.summary);
                          setLocation('/chat');
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                        size="sm"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        💬 Chat about Document
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between w-full flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopySummary(currentSummary.summary)}
                      className="hover:bg-violet-100 hover:border-violet-300 rounded-lg transition-all"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Summary
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentSummary(null)}
                      className="hover:bg-violet-100 hover:border-violet-300 rounded-lg transition-all"
                    >
                      Close
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
          </TabsContent>

          <TabsContent value="saved">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">Saved Summaries</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        View and manage your previously generated summaries.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {summariesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="border-2 animate-pulse">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 space-y-2">
                                <div className="h-5 bg-muted rounded w-1/3"></div>
                                <div className="h-4 bg-muted rounded w-1/4"></div>
                              </div>
                              <div className="flex gap-2">
                                <div className="h-8 w-16 bg-muted rounded"></div>
                                <div className="h-8 w-16 bg-muted rounded"></div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <div className="h-4 bg-muted rounded w-full"></div>
                              <div className="h-4 bg-muted rounded w-5/6"></div>
                              <div className="flex gap-2 mt-3">
                                <div className="h-6 w-16 bg-muted rounded-full"></div>
                                <div className="h-6 w-20 bg-muted rounded-full"></div>
                                <div className="h-6 w-16 bg-muted rounded-full"></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : summariesData?.summaries && summariesData.summaries.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      {summariesData.summaries.map((summary, index) => (
                        <motion.div
                          key={summary.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="h-full"
                        >
                          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl group h-full flex flex-col bg-gradient-to-br from-background to-primary/5 relative overflow-hidden">
                            {/* Decorative gradient overlay */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            <CardHeader className="pb-4 relative z-10">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                                    <FileText className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs font-mono bg-background/50">
                                        #{summary.id}
                                      </Badge>
                                      <CardTitle className="text-base sm:text-lg font-bold">
                                        Summary {summary.id}
                                      </CardTitle>
                                    </div>
                                    <CardDescription className="flex items-center gap-1.5 text-xs mt-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(summary.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </CardDescription>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Summary preview with gradient fade */}
                              <div className="relative">
                                <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
                                  {summary.summary}
                                </p>
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                              </div>
                            </CardHeader>
                            
                            <CardContent className="pt-0 flex-1 flex flex-col gap-4 relative z-10">
                              {/* Keywords section */}
                              {summary.keywords && summary.keywords.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Sparkles className="h-3 w-3" />
                                    <span>Keywords</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {summary.keywords.slice(0, 5).map((keyword, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant="secondary" 
                                        className="text-xs px-2.5 py-1 bg-gradient-to-r from-primary/15 to-primary/10 hover:from-primary/25 hover:to-primary/20 border border-primary/20 transition-all cursor-default"
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                    {summary.keywords.length > 5 && (
                                      <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-muted/50">
                                        +{summary.keywords.length - 5}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Key points indicator */}
                              {summary.keyPoints && summary.keyPoints.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                  <span className="font-medium">{summary.keyPoints.length} Key Points</span>
                                </div>
                              )}
                              
                              {/* Action buttons */}
                              <div className="grid grid-cols-4 gap-2 mt-auto pt-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewSummary(summary)}
                                        className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover:scale-105 active:scale-95"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopySummary(summary.summary)}
                                        className="hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all hover:scale-105 active:scale-95"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Copy</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadSummary(summary)}
                                        className="hover:bg-green-500 hover:text-white hover:border-green-500 transition-all hover:scale-105 active:scale-95"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Download</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteSummary(summary.id)}
                                        disabled={deleteSummaryMutation.isPending}
                                        className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all hover:scale-105 active:scale-95"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12 sm:py-16"
                    >
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                        <FileText className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-muted-foreground/50 relative" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">No summaries yet</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-6">
                        Create your first summary to get started!
                      </p>
                      <Button 
                        onClick={() => document.querySelector('[value="create"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Summary
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Bulk Generate Flashcards Dialog */}
      {currentSummary && (
        <BulkGenerateDialog
          open={showBulkGenerateDialog}
          onOpenChange={setShowBulkGenerateDialog}
          documentId={currentSummary?.documentId || savedDocumentId || null}
          documentText={currentSummary?.originalText || ""}
          onSuccess={() => {
            toast({
              title: "Success!",
              description: "Flashcards have been created. Visit the Flashcards page to study them.",
            });
          }}
        />
      )}
    </DashboardLayout>
  );
}