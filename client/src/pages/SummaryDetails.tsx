import { useEffect } from "react";
import * as React from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Clock, CheckCircle2, Sparkles, TrendingUp, Copy, ArrowLeft, Brain, FileDown, FileType, File, AlertCircle, MessageSquare, BookOpen } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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

export default function SummaryDetails() {
  const [, params] = useRoute("/summary/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const summaryId = params?.id ? parseInt(params.id) : null;
  const [showBulkGenerateDialog, setShowBulkGenerateDialog] = React.useState<boolean>(false);

  // Fetch summary details
  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: [`/api/summaries/${summaryId}`],
    queryFn: () => apiRequest<{ summary: Summary }>(`/api/summaries/${summaryId}`),
    enabled: !!summaryId,
  });

  const summary = summaryData?.summary;

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading summary",
        description: "Could not load the summary details. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Summary has been copied to your clipboard.",
    });
  };

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!summary) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Summary not found</p>
              <div className="flex justify-center mt-4">
                <Button onClick={() => setLocation("/document-summarization")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Summaries
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header with Back Button */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              onClick={() => setLocation("/document-summarization")}
              className="mb-4 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Summaries
            </Button>
          </motion.div>

          {/* Summary Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-violet-200 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500/15 via-purple-500/15 to-indigo-500/15 border-b border-violet-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">#{summary.id}</Badge>
                      <CardTitle className="text-xl sm:text-2xl">Summary Details</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Clock className="h-3.5 w-3.5" />
                      Created: {new Date(summary.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                    {summary.metadata && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                          <Clock className="h-3 w-3 mr-1" />
                          ⏱ {summary.metadata.readingTime} min read
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            summary.metadata.difficultyLevel === 'Easy' ? 'bg-green-50 border-green-300 text-green-700' :
                            summary.metadata.difficultyLevel === 'Medium' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                            'bg-red-50 border-red-300 text-red-700'
                          }`}
                        >
                          📊 {summary.metadata.difficultyLevel}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                          📉 {summary.metadata.compression}% compression
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                          ✅ {summary.metadata.status}
                        </Badge>
                      </div>
                    )}
                  </div>
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
                              onClick={() => handleCopySummary(summary.summary)}
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
                  {(!summary.summary || summary.summary.trim().length < 20) ? (
                    <Alert className="border-red-200 bg-red-50/50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-sm font-medium text-red-900">Empty or Invalid Summary</AlertTitle>
                      <AlertDescription className="text-xs text-red-700">
                        This summary appears to be empty or incomplete. The AI may have failed to generate proper content.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-xl border-2 border-violet-100 whitespace-pre-wrap text-sm sm:text-base leading-relaxed shadow-inner">
                      {summary.summary}
                    </div>
                  )}
                </motion.div>
                
                {summary.keyPoints && summary.keyPoints.length > 0 && (
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
                      {summary.keyPoints.map((point, index) => (
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
                
                {summary.keywords && summary.keywords.length > 0 && (
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
                      {summary.keywords.map((keyword, index) => (
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

                {summary.metadata?.insights && summary.metadata.insights.length > 0 && (
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
                      {summary.metadata.insights.map((insight, index) => (
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

                {summary.metadata?.applications && summary.metadata.applications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                      <Brain className="h-5 w-5 text-primary" />
                      🎯 Applications
                    </h3>
                    <div className="space-y-3">
                      {summary.metadata.applications.map((application, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="p-4 bg-gradient-to-r from-green-50 to-transparent rounded-xl border border-green-200 hover:border-green-400 transition-all hover:shadow-md"
                        >
                          <p className="text-sm text-green-900">{application}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {summary.metadata?.relatedLinks && summary.metadata.relatedLinks.length > 0 && (
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
                      {summary.metadata.relatedLinks.map((link, index) => (
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Original Text
                  </h3>
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-muted to-muted/50 rounded-lg border-2 border-border whitespace-pre-wrap max-h-60 sm:max-h-80 overflow-y-auto scrollbar-thin text-sm sm:text-base leading-relaxed">
                    {summary.originalText}
                  </div>
                </motion.div>

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
              <CardFooter className="flex-col gap-4 bg-muted/30">
                {/* Download Section */}
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Download Summary</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTXT(summary)}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      📄 Download TXT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(summary)}
                      className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <File className="h-4 w-4 mr-2" />
                      🧾 Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDOCX(summary)}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <FileType className="h-4 w-4 mr-2" />
                      📝 Download Word
                    </Button>
                  </div>
                </div>
                
                {/* Generate Flashcards & Chat Section */}
                <div className="w-full space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Study Tools</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {summary.documentId && (
                      <Button
                        onClick={() => setShowBulkGenerateDialog(true)}
                        className="flex-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:via-rose-600 hover:to-red-600 text-white border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        🧠 Generate Flashcards
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        sessionStorage.setItem('documentChatContext', summary.originalText || summary.summary);
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
                    onClick={() => handleCopySummary(summary.summary)}
                    className="hover:bg-background"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Summary
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/document-summarization")}
                    className="hover:bg-background"
                  >
                    Close
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bulk Generate Flashcards Dialog */}
      {summary && (
        <BulkGenerateDialog
          open={showBulkGenerateDialog}
          onOpenChange={setShowBulkGenerateDialog}
          documentId={summary.documentId!}
          documentText={summary.originalText || ""}
          onSuccess={() => {
            toast({
              title: "Success!",
              description: "Flashcards have been created. Visit the Flashcards page to study them.",
            });
            setShowBulkGenerateDialog(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
