import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isDefined } from "@/lib/utils";
import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/ui/icons";

// Define the form schema for code generation
const codeGenerationSchema = z.object({
  problem: z.string().min(10, "Please describe your problem in more detail"),
  language: z.enum(["python", "javascript", "java", "c++", "typescript"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  context: z.string().optional(),
});

type CodeGenerationFormValues = z.infer<typeof codeGenerationSchema>;

interface CodeGenerationResponse {
  codeSnippet: {
    id: number;
    title: string;
    code: string;
    problem: string;
    language: string;
    explanation: string;
  };
  message: string;
}

interface CodeSnippet {
  id: number;
  title: string;
  code: string;
  problem: string;
  language: string;
  explanation: string;
  createdAt?: Date;
}

export default function CodeGenerator() {
  const [activeTab, setActiveTab] = useState("generator");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Define form with validation
  const form = useForm<CodeGenerationFormValues>({
    resolver: zodResolver(codeGenerationSchema),
    defaultValues: {
      problem: "",
      language: "javascript",
      difficulty: "medium",
      context: "",
    },
  });

  interface CodeSnippetsResponse {
    snippets: CodeSnippet[];
    message: string;
  }

  // Get previously generated code snippets
  const { data: snippets, isLoading: isLoadingSnippets } = useQuery<CodeSnippetsResponse>({
    queryKey: ["/api/code-snippets"],
    meta: {
      errorMessage: "Failed to fetch your code snippets"
    }
  });

  // Mutation for generating code
  const { mutate: generateCode, isPending } = useMutation({
    mutationFn: (data: CodeGenerationFormValues) => 
      apiRequest('/api/code-generator', {
        method: 'POST',
        data,
      }),
    onSuccess: (data) => {
      toast({
        title: "Code generated successfully",
        description: "Your code solution is ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      setActiveTab("results");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to generate code",
        description: error.message || "Please try again later",
      });
    },
  });

  function onSubmit(data: CodeGenerationFormValues) {
    generateCode(data);
  }

  // Get the latest generated snippet
  const latestSnippet = snippets?.snippets?.[0];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">AI Code Generator</h1>
            <p className="text-gray-500 mt-1">
              Generate code solutions for programming problems using AI
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generator">Generate Code</TabsTrigger>
            <TabsTrigger value="history">Saved Solutions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Code Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Problem Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="problem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Programming Problem</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your programming problem in detail..."
                                className="min-h-[120px] resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Programming Language</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="javascript">JavaScript</SelectItem>
                                  <SelectItem value="python">Python</SelectItem>
                                  <SelectItem value="java">Java</SelectItem>
                                  <SelectItem value="c++">C++</SelectItem>
                                  <SelectItem value="typescript">TypeScript</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty Level</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Context (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add any additional context, e.g., 'This is for a beginner learning algorithms'"
                                className="resize-y"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Provide any context that might help the AI generate better code for your needs
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isPending}
                      >
                        {isPending ? (
                          <>
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Icons.code className="mr-2 h-4 w-4" />
                            Generate Solution
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Results Preview (shows latest generated code) */}
              <Card>
                <CardHeader>
                  <CardTitle>Code Solution</CardTitle>
                </CardHeader>
                <CardContent>
                  {isPending ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                      <Icons.spinner className="h-8 w-8 animate-spin mb-4" />
                      <p>Generating your code solution...</p>
                      <p className="text-sm text-gray-500 mt-2">This might take a moment</p>
                    </div>
                  ) : latestSnippet ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium">Problem:</h3>
                        <p className="text-sm mt-1">{latestSnippet.problem}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="font-medium">Solution ({latestSnippet.language}):</h3>
                        <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto text-sm">
                          <code>{latestSnippet.code}</code>
                        </pre>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="font-medium">Explanation:</h3>
                        <p className="text-sm mt-1">{latestSnippet.explanation}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                      <Icons.code className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
                      <h3 className="font-medium text-lg">No code generated yet</h3>
                      <p className="text-sm text-gray-500 mt-2">
                        Fill out the form and click "Generate Solution" to create your first code solution
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Saved Code Solutions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSnippets ? (
                  <div className="flex justify-center p-8">
                    <Icons.spinner className="h-8 w-8 animate-spin" />
                  </div>
                ) : (snippets && snippets.snippets && snippets.snippets.length > 0) ? (
                  <div className="space-y-6">
                    {snippets.snippets.map((snippet: CodeSnippet) => (
                      <Card key={snippet.id} className="overflow-hidden">
                        <CardHeader className="bg-gray-50 dark:bg-gray-900 py-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-medium">
                              {snippet.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                {snippet.language}
                              </span>
                              <Button variant="ghost" size="icon">
                                <Icons.copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium">Problem:</h3>
                              <p className="text-sm mt-1">{snippet.problem}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium">Solution:</h3>
                              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto text-xs">
                                <code>{snippet.code}</code>
                              </pre>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium">Explanation:</h3>
                              <p className="text-sm mt-1">{snippet.explanation}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Icons.code className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No saved code solutions yet</h3>
                    <p className="text-gray-500 mt-2">
                      Generate your first code solution to see it here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}