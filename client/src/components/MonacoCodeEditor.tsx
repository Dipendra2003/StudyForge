import { useRef, useState, useEffect } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  onRun: () => void;
  isRunning: boolean;
  output: string;
  onClearOutput: () => void;
  stdin?: string;
  onStdinChange?: (value: string) => void;
  showTemplates?: () => void;
  onDownload?: () => void;
  onAnalyze?: () => void;
  readOnly?: boolean;
  height?: string;
  children?: React.ReactNode;
}

type ThemeType = "vs-dark" | "light" | "dracula" | "github-dark";

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  "c++": "cpp",
  "c#": "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  r: "r",
  sql: "sql",
};

// Default code templates for each language
export const DEFAULT_CODE_TEMPLATES: Record<string, string> = {
  javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");',
  typescript: '// Write your TypeScript code here\nconst message: string = "Hello, World!";\nconsole.log(message);',
  python: '# Write your Python code here\nprint("Hello, World!")',
  java: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  "c++": '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  "c#": '// Write your C# code here\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
  go: '// Write your Go code here\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  rust: '// Write your Rust code here\nfn main() {\n    println!("Hello, World!");\n}',
  ruby: '# Write your Ruby code here\nputs "Hello, World!"',
  php: '<?php\n// Write your PHP code here\necho "Hello, World!";\n?>',
  swift: '// Write your Swift code here\nprint("Hello, World!")',
  kotlin: '// Write your Kotlin code here\nfun main() {\n    println("Hello, World!")\n}',
  r: '# Write your R code here\nprint("Hello, World!")',
  sql: '-- Write your SQL code here\nSELECT "Hello, World!" AS message;',
};

const getDefaultCode = (language: string): string => {
  return DEFAULT_CODE_TEMPLATES[language] || '// Start coding...';
};

export default function MonacoCodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  onRun,
  isRunning,
  output,
  onClearOutput,
  stdin,
  onStdinChange,
  showTemplates,
  onDownload,
  onAnalyze,
  readOnly = false,
  height,
  children,
}: MonacoCodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeType>("vs-dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editorHeight, setEditorHeight] = useState(() => {
    if (height) return height;
    // Responsive height based on screen size
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? "300px" : window.innerWidth < 1024 ? "400px" : "500px";
    }
    return "500px";
  });
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState<"on" | "off">("off");
  const [fontSize, setFontSize] = useState(() => {
    // Responsive font size
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 12 : 14;
    }
    return 14;
  });
  const { toast } = useToast();

  // Ensure we have a default value
  const editorValue = value || getDefaultCode(language);

  // Propagate default code to parent if value is empty
  useEffect(() => {
    if (!value) {
      onChange(getDefaultCode(language));
    }
  }, [value, language]);

  // Define custom themes
  useEffect(() => {
    if (monacoRef.current) {
      const monaco = monacoRef.current;

      // Dracula Theme
      monaco.editor.defineTheme("dracula", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6272A4", fontStyle: "italic" },
          { token: "keyword", foreground: "FF79C6" },
          { token: "string", foreground: "F1FA8C" },
          { token: "number", foreground: "BD93F9" },
          { token: "type", foreground: "8BE9FD" },
          { token: "function", foreground: "50FA7B" },
          { token: "variable", foreground: "F8F8F2" },
        ],
        colors: {
          "editor.background": "#282A36",
          "editor.foreground": "#F8F8F2",
          "editor.lineHighlightBackground": "#44475A",
          "editorCursor.foreground": "#F8F8F0",
          "editor.selectionBackground": "#44475A",
          "editorLineNumber.foreground": "#6272A4",
        },
      });

      // GitHub Dark Theme
      monaco.editor.defineTheme("github-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "8B949E", fontStyle: "italic" },
          { token: "keyword", foreground: "FF7B72" },
          { token: "string", foreground: "A5D6FF" },
          { token: "number", foreground: "79C0FF" },
          { token: "type", foreground: "FFA657" },
          { token: "function", foreground: "D2A8FF" },
          { token: "variable", foreground: "FFA657" },
        ],
        colors: {
          "editor.background": "#0D1117",
          "editor.foreground": "#C9D1D9",
          "editor.lineHighlightBackground": "#161B22",
          "editorCursor.foreground": "#58A6FF",
          "editor.selectionBackground": "#1F6FEB",
          "editorLineNumber.foreground": "#6E7681",
        },
      });
    }
  }, [monacoRef.current]);

  // Handle responsive adjustments and resize observations
  useEffect(() => {
    const handleResize = () => {
      if (!isFullscreen && typeof window !== 'undefined') {
        // Auto-hide minimap on mobile
        if (window.innerWidth < 768 && showMinimap) {
          setShowMinimap(false);
          editorRef.current?.updateOptions({ minimap: { enabled: false } });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen, showMinimap]);

  // Dynamic height is now handled accurately inside handleEditorDidMount using onDidContentSizeChange

  // Ensure layout is recalculated when container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Accurately adjust container height to fit Monaco's exact content size
    const updateHeight = () => {
      if (!isFullscreen && !height) {
        // getContentHeight() provides pixel-perfect height required for all lines
        const contentHeight = editor.getContentHeight();
        const cappedHeight = Math.min(600, Math.max(80, contentHeight + 4)); // +4px buffer to completely avoid tiny scrollbars
        setEditorHeight(`${cappedHeight}px`);
      }
    };

    editor.onDidContentSizeChange(updateHeight);
    updateHeight(); // Initial trigger

    // Force layout initially to fix empty/blue space issues when rendering in hidden tabs
    setTimeout(() => {
      editor.layout();
      updateHeight();
    }, 100);
    setTimeout(() => {
      editor.layout();
      updateHeight();
    }, 500);

    // Configure editor options
    editor.updateOptions({
      fontSize: fontSize,
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
      fontLigatures: true,
      lineNumbers: "on",
      renderLineHighlight: "all",
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      autoIndent: "full",
      formatOnPaste: true,
      formatOnType: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: wordWrap,
      minimap: {
        enabled: showMinimap,
      },
      bracketPairColorization: {
        enabled: true,
      },
      guides: {
        indentation: true,
        bracketPairs: true,
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      parameterHints: {
        enabled: true,
      },
      folding: true,
      foldingStrategy: "indentation",
      showFoldingControls: "always",
      matchBrackets: "always",
      autoClosingBrackets: "always",
      autoClosingQuotes: "always",
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        alwaysConsumeMouseWheel: false,
      },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      formatCode();
    });
  };

  const formatCode = () => {
    if (!editorRef.current) return;
    
    const supportedLangs = ['javascript', 'typescript', 'json', 'html', 'css'];
    
    if (supportedLangs.includes(monacoLanguage)) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
      toast({
        title: "Code formatted",
        description: "Your code has been formatted",
      });
    } else {
      // Basic fallback indentation formatter for C-style languages (Java, C++, C#, Rust, etc)
      const val = editorRef.current.getValue();
      let formatted = "";
      let indentLevel = 0;
      const lines = val.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (line.length === 0) {
          formatted += '\n';
          continue;
        }
        
        // Decrease indent for lines starting with closing brace
        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        
        formatted += '    '.repeat(indentLevel) + line + '\n';
        
        // Increase indent for lines ending with opening brace
        if (line.endsWith('{')) {
          indentLevel++;
        }
      }
      
      editorRef.current.setValue(formatted.trimEnd());
      toast({
        title: "Code formatted",
        description: "Applied basic indentation formatting",
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setEditorHeight("calc(100vh - 200px)");
    } else {
      // Restore responsive height
      if (typeof window !== 'undefined') {
        const responsiveHeight = height || (window.innerWidth < 640 ? "300px" : window.innerWidth < 1024 ? "400px" : "500px");
        setEditorHeight(responsiveHeight);
      } else {
        setEditorHeight(height || "500px");
      }
    }
  };

  const handleLanguageChange = (newLang: string) => {
    onLanguageChange(newLang);
    // Auto-update template if editor is empty or currently matches any default template
    const isCurrentCodeDefault = !value || Object.values(DEFAULT_CODE_TEMPLATES).includes(value) || value === '// Start coding...';
    if (isCurrentCodeDefault) {
      onChange(getDefaultCode(newLang));
    }
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
  };

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 24);
    setFontSize(newSize);
    editorRef.current?.updateOptions({ fontSize: newSize });
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 10);
    setFontSize(newSize);
    editorRef.current?.updateOptions({ fontSize: newSize });
  };

  const toggleMinimap = () => {
    const newValue = !showMinimap;
    setShowMinimap(newValue);
    editorRef.current?.updateOptions({ minimap: { enabled: newValue } });
  };

  const toggleWordWrap = () => {
    const newValue = wordWrap === "on" ? "off" : "on";
    setWordWrap(newValue);
    editorRef.current?.updateOptions({ wordWrap: newValue });
  };

  const monacoLanguage = LANGUAGE_MAP[language] || "javascript";

  return (
    <div className={`flex flex-col w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-background" : ""}`}>
      {/* Top Row - Language and Run */}
      <div className="flex flex-col gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-b">
        {/* Top Row - Language and Run */}
        <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full xs:w-[140px] sm:w-[160px] md:w-[180px] focus:ring-purple-500 h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="z-[110] max-h-[300px]">
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="c++">C++</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
              <SelectItem value="ruby">Ruby</SelectItem>
              <SelectItem value="php">PHP</SelectItem>
              <SelectItem value="swift">Swift</SelectItem>
              <SelectItem value="kotlin">Kotlin</SelectItem>
              <SelectItem value="c#">C#</SelectItem>
              <SelectItem value="r">R</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
            </SelectContent>
          </Select>


        </div>

        {/* Bottom Row - Editor Controls */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {/* Theme Selector */}
          <Select value={theme} onValueChange={(value) => handleThemeChange(value as ThemeType)}>
            <SelectTrigger className="w-[100px] xs:w-[120px] sm:w-[140px] md:w-[160px] h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="vs-dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dracula">Dracula</SelectItem>
              <SelectItem value="github-dark">GitHub</SelectItem>
            </SelectContent>
          </Select>

          {/* Font Size Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={decreaseFontSize}
              className="h-7 sm:h-8 px-1.5 sm:px-2"
            >
              <Icons.minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
            <span className="text-[10px] xs:text-xs px-1 sm:px-2 border-x">{fontSize}px</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={increaseFontSize}
              className="h-7 sm:h-8 px-1.5 sm:px-2"
            >
              <Icons.plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
          </div>

          {/* Editor Options */}
          <Button
            variant={showMinimap ? "default" : "outline"}
            size="sm"
            onClick={toggleMinimap}
            className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
          >
            <Icons.map className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden xs:inline">Map</span>
          </Button>

          <Button
            variant={wordWrap === "on" ? "default" : "outline"}
            size="sm"
            onClick={toggleWordWrap}
            className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
          >
            <Icons.wrap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden xs:inline">Wrap</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={formatCode}
            className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
          >
            <Icons.wand className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">Format</span>
          </Button>

          {showTemplates && (
            <Button
              variant="outline"
              size="sm"
              onClick={showTemplates}
              className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
            >
              <Icons.bookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden md:inline">Templates</span>
            </Button>
          )}

          {onAnalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAnalyze}
              className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
            >
              <Icons.zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden md:inline">Analyze</span>
            </Button>
          )}

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
            >
              <Icons.arrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 rotate-90" />
              <span className="hidden lg:inline">Download</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs ml-auto"
          >
            {isFullscreen ? (
              <>
                <Icons.minimize className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden xs:inline">Exit</span>
              </>
            ) : (
              <>
                <Icons.maximize className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden xs:inline">Full</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {children}

      {/* Editor */}
      <div 
        ref={containerRef}
        className={`border-b transition-colors duration-200 relative w-full ${isFullscreen ? "flex-1" : ""}`} 
        style={{ 
          height: editorHeight, 
          minHeight: editorHeight,
          backgroundColor: theme === 'light' ? '#fffffe' : theme === 'dracula' ? '#282A36' : theme === 'github-dark' ? '#0D1117' : '#1e1e1e'
        }}
      >
        <div className="absolute inset-0">
          <Editor
            height="100%"
            width="100%"
          language={monacoLanguage}
          value={editorValue}
          onChange={(value) => onChange(value || "")}
          theme={theme}
          onMount={handleEditorDidMount}
          loading={
            <div 
              className="flex items-center justify-center h-full transition-colors duration-200"
              style={{ backgroundColor: theme === 'light' ? '#fffffe' : theme === 'dracula' ? '#282A36' : theme === 'github-dark' ? '#0D1117' : '#1e1e1e' }}
            >
              <div className="flex flex-col items-center gap-3">
                <Icons.spinner className="h-8 w-8 animate-spin text-purple-600" />
                <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Loading editor...</p>
              </div>
            </div>
          }
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            }
          }}
        />
      </div>
    </div>

      {/* Input Panel - Only show if onStdinChange is provided */}
      {onStdinChange && (
        <div className="flex flex-col border-t border-slate-800 bg-slate-900 text-slate-50">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border-b border-slate-800">
            <Icons.terminal className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
            <h3 className="font-semibold text-xs sm:text-sm">Standard Input (stdin)</h3>
            <span className="text-[10px] sm:text-xs text-slate-400 font-normal ml-auto">Provide values for Scanner, cin, input()</span>
          </div>
          <div className="p-2 sm:p-3 md:p-4">
            <Textarea 
              value={stdin || ""}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Type your inputs here separated by spaces or newlines before running..."
              className="min-h-[80px] font-mono text-xs sm:text-sm resize-y bg-slate-950 text-slate-200 border-slate-700 focus-visible:ring-purple-500/50 placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      {/* Run Code Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-inner relative z-10">
        <Badge variant="secondary" className="hidden sm:flex text-xs bg-slate-800/80 text-slate-300 border-slate-700">
          Ctrl+Enter to Run
        </Badge>
        <Button
          size="default"
          className="gap-1 sm:gap-2 bg-green-600 hover:bg-green-500 text-white h-8 sm:h-10 text-xs sm:text-sm ml-auto px-4 sm:px-8 font-bold shadow-lg shadow-green-900/40 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={onRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Icons.spinner className="h-4 w-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Icons.play className="h-4 w-4 fill-current" />
              <span>Run Code</span>
            </>
          )}
        </Button>
      </div>

      {/* Output Panel - Only show when there's output */}
      {output && (
        <div className="flex flex-col bg-slate-950 text-slate-50 border-t">
          <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Icons.code className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
              <h3 className="font-semibold text-xs sm:text-sm">Console Output</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearOutput}
              className="gap-1 sm:gap-2 text-slate-400 hover:text-slate-50 h-6 sm:h-8 px-1.5 sm:px-2"
            >
              <Icons.trash className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden xs:inline text-xs">Clear</span>
            </Button>
          </div>
          <div className="p-2 sm:p-3 md:p-4 overflow-auto" style={{ minHeight: "120px", maxHeight: "250px" }}>
            <pre className="text-xs sm:text-sm text-green-400 font-mono whitespace-pre-wrap break-words">
              <code>{output}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
