import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export default function DocumentSummarization() {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [summaryType, setSummaryType] = useState<string>("concise");
  const [isFileUploaded, setIsFileUploaded] = useState<boolean>(false);
  const { toast } = useToast();

  // Upload and process document
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest<{ text: string }>("/api/documents", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      setDocumentText(data.text || "");
      setIsFileUploaded(true);
      toast({
        title: "Document uploaded successfully",
        description: "Your document has been processed and is ready for summarization.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error uploading document",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
      console.error("Upload error:", error);
    },
  });

  // Summarize text
  const summarizeMutation = useMutation({
    mutationFn: async (data: { text: string; type: string }) => {
      return apiRequest<{ summary: string }>("/api/documents/summarize", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data) => {
      setSummary(data.summary || "");
      toast({
        title: "Summary generated",
        description: "Your document has been summarized successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating summary",
        description: "There was an error summarizing your document. Please try again.",
        variant: "destructive",
      });
      console.error("Summarization error:", error);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a document to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    uploadMutation.mutate(formData);
  };

  const handleSummarize = () => {
    if (!documentText) {
      toast({
        title: "No text to summarize",
        description: "Please upload a document or enter text to summarize.",
        variant: "destructive",
      });
      return;
    }

    summarizeMutation.mutate({
      text: documentText,
      type: summaryType,
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Document Summarization</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload a PDF, DOCX, or TXT file to summarize, or paste your text directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PDF, DOCX, or TXT (MAX. 10MB)
                        </p>
                      </div>
                      <input
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  {file && (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  )}
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || uploadMutation.isPending}
                    className="w-full"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upload & Process"
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="paste">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste your text here to summarize..."
                      className="min-h-[250px]"
                      value={documentText}
                      onChange={(e) => {
                        setDocumentText(e.target.value);
                        setIsFileUploaded(true);
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Summarization Settings</CardTitle>
              <CardDescription>
                Configure how you want your document to be summarized.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary-type">Summary Type</Label>
                <select
                  id="summary-type"
                  className="w-full p-2 border rounded-md bg-background"
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                >
                  <option value="concise">Concise (Key Points)</option>
                  <option value="detailed">Detailed (Comprehensive)</option>
                  <option value="eli5">ELI5 (Simplified Explanation)</option>
                  <option value="academic">Academic (Scholarly Format)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Summary Length</Label>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Shorter</span>
                    <span>Longer</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              </div>

              <Button
                onClick={handleSummarize}
                className="w-full mt-4"
                disabled={!isFileUploaded || summarizeMutation.isPending}
              >
                {summarizeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  "Generate Summary"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {summary && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Document Summary</CardTitle>
              <CardDescription>
                Here's the {summaryType} summary of your document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                {summary}
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="outline">
                <File className="mr-2 h-4 w-4" />
                Save as Document
              </Button>
              <Button>
                Download Summary
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}