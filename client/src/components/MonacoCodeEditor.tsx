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
    if (isFullscreen && height !== "100%" && typeof window !== 'undefined') {
      // Restore responsive height when exiting fullscreen
      const responsiveHeight = height || (window.innerWidth < 640 ? "300px" : window.innerWidth < 1024 ? "400px" : "500px");
      setEditorHeight(responsiveHeight);
    } else if (isFullscreen && height === "100%") {
      setEditorHeight("100%");
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
  const isLightTheme = theme === 'light';

  return (
    <div className={`flex flex-col w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl" : "h-full"}`}>
      {/* Unified Glassmorphic Toolbar */}
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none flex-nowrap shrink-0 z-10 shadow-sm transition-all">
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[120px] sm:w-[140px] shrink-0 h-8 sm:h-9 text-xs font-medium glass-button rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="z-[110] glass-panel rounded-xl shadow-2xl border-primary/20">
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

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 shrink-0 mx-1 hidden sm:block"></div>

        <Select value={theme} onValueChange={(value) => handleThemeChange(value as ThemeType)}>
          <SelectTrigger className="w-[100px] sm:w-[110px] shrink-0 h-8 sm:h-9 text-xs glass-button rounded-full">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent className="z-[110] glass-panel rounded-xl border-slate-200 dark:border-slate-800">
            <SelectItem value="vs-dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dracula">Dracula</SelectItem>
            <SelectItem value="github-dark">GitHub</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 shrink-0 bg-slate-100/80 dark:bg-slate-800/80 rounded-full px-1 border border-slate-200 dark:border-slate-700 h-8 sm:h-9">
          <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0 text-slate-600 dark:text-slate-400">
            <Icons.minus className="h-3 w-3" />
          </Button>
          <span className="text-[11px] font-medium w-8 text-center text-slate-700 dark:text-slate-300">{fontSize}px</span>
          <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0 text-slate-600 dark:text-slate-400">
            <Icons.plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 shrink-0 mx-1"></div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMinimap}
          className={`gap-1.5 h-8 sm:h-9 px-3 rounded-full text-xs font-medium shrink-0 transition-all ${showMinimap ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/30' : 'glass-button text-slate-600 dark:text-slate-400'}`}
        >
          <Icons.map className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Map</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleWordWrap}
          className={`gap-1.5 h-8 sm:h-9 px-3 rounded-full text-xs font-medium shrink-0 transition-all ${wordWrap === "on" ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/30' : 'glass-button text-slate-600 dark:text-slate-400'}`}
        >
          <Icons.wrap className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Wrap</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={formatCode}
          className="gap-1.5 h-8 sm:h-9 px-3 rounded-full text-xs font-medium shrink-0 glass-button text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Icons.wand className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Format</span>
        </Button>

        {showTemplates && (
          <Button
            variant="ghost"
            size="sm"
            onClick={showTemplates}
            className="gap-1.5 h-8 sm:h-9 px-3 rounded-full text-xs font-medium shrink-0 glass-button text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Icons.bookOpen className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Templates</span>
          </Button>
        )}

        {onAnalyze && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAnalyze}
            className="gap-1.5 h-8 sm:h-9 px-3 rounded-full text-xs font-medium shrink-0 glass-button text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors ring-1 ring-purple-200 dark:ring-purple-800/50"
          >
            <Icons.zap className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Analyze</span>
          </Button>
        )}

        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="gap-1.5 h-8 sm:h-9 px-3 rounded-full text-xs font-medium shrink-0 glass-button text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Icons.arrowRight className="h-3.5 w-3.5 rotate-90" />
            <span className="hidden xl:inline">Download</span>
          </Button>
        )}

        <div className="flex-1 min-w-[10px]"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0 transition-all ${isFullscreen ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 ring-1 ring-red-500/30' : 'glass-button bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/30'}`}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Icons.minimize className="h-4 w-4" /> : <Icons.maximize className="h-4 w-4" />}
        </Button>
      </div>

      {children}

      {/* Editor */}
      <div 
        ref={containerRef}
        className={`border-b transition-colors duration-200 relative w-full ${(isFullscreen || height === "100%") ? "flex-1 min-h-0" : ""}`} 
        style={{ 
          height: (isFullscreen || height === "100%") ? undefined : editorHeight, 
          minHeight: (isFullscreen || height === "100%") ? undefined : editorHeight,
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
        <div className={`flex flex-col backdrop-blur-md border-t shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] z-20 transition-all duration-300 ${isLightTheme ? 'bg-white/95 text-slate-800 border-slate-200' : 'bg-slate-900/95 text-slate-50 border-slate-700/50'}`}>
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b ${isLightTheme ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800/80 bg-slate-950/50'}`}>
            <div className={`flex items-center justify-center h-6 w-6 rounded-md border shadow-inner ${isLightTheme ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>
              <Icons.terminal className="h-3.5 w-3.5" />
            </div>
            <h3 className={`font-semibold text-xs sm:text-sm tracking-wide ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>Standard Input (stdin)</h3>
            <span className={`text-[10px] sm:text-xs font-medium ml-auto px-2 py-0.5 rounded-full border ${isLightTheme ? 'bg-slate-100 text-slate-500 border-slate-200' : 'text-slate-500 bg-slate-800/50 border-slate-700/50'}`}>Provide values for Scanner, cin, input()</span>
          </div>
          <div className={`p-2 sm:p-3 ${isLightTheme ? 'bg-slate-50/80' : 'bg-slate-900/80'}`}>
            <Textarea 
              value={stdin || ""}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Type your inputs here separated by spaces or newlines before running..."
              className={`min-h-[70px] font-mono text-xs sm:text-sm resize-y focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 rounded-lg shadow-inner transition-colors ${isLightTheme ? 'bg-white text-slate-800 border-slate-200 placeholder:text-slate-400' : 'bg-black/40 text-slate-200 border-slate-700/50 placeholder:text-slate-600'}`}
            />
          </div>
        </div>
      )}

      {/* Run Code Action Bar */}
      <div className={`flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-t backdrop-blur-xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] relative z-20 ${isLightTheme ? 'border-slate-200 bg-white/80' : 'border-slate-700/50 bg-slate-900/80'}`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center h-8 w-8 rounded-full border shadow-inner ${isLightTheme ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
            <Icons.code className="h-4 w-4" />
          </div>
          <Badge variant="outline" className={`hidden sm:flex text-[10px] font-medium tracking-wider uppercase py-1 ${isLightTheme ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950/50 text-slate-400 border-slate-700/50'}`}>
            Ctrl+Enter to Run
          </Badge>
        </div>
        <Button
          size="default"
          className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white h-9 sm:h-10 text-xs sm:text-sm ml-auto px-6 sm:px-8 font-bold shadow-lg shadow-green-900/40 rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ring-1 ring-emerald-400/30"
          onClick={onRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Icons.spinner className="h-4 w-4 animate-spin" />
              <span className="tracking-wide">Executing...</span>
            </>
          ) : (
            <>
              <Icons.play className="h-4 w-4 fill-current drop-shadow-md" />
              <span className="tracking-wide text-shadow-sm">Run Code</span>
            </>
          )}
        </Button>
      </div>

      {/* Output Panel - Only show when there's output */}
      {output && (
        <div className={`flex flex-col border-t z-20 relative shadow-inner ${isLightTheme ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-black/90 text-slate-50 border-slate-800'}`}>
          <div className={`flex items-center justify-between px-3 sm:px-4 py-2 border-b backdrop-blur-sm ${isLightTheme ? 'border-slate-200 bg-white/80' : 'border-slate-800/80 bg-slate-950/80'}`}>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center h-6 w-6 rounded-md border shadow-inner ${isLightTheme ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                <Icons.check className="h-3.5 w-3.5" />
              </div>
              <h3 className={`font-semibold text-xs sm:text-sm tracking-wide ${isLightTheme ? 'text-emerald-700' : 'text-emerald-100'}`}>Execution Result</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearOutput}
              className={`gap-1.5 h-7 px-2.5 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-500 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}
            >
              <Icons.trash className="h-3.5 w-3.5" />
              <span className="hidden xs:inline text-xs font-medium">Clear</span>
            </Button>
          </div>
          <div className={`p-3 sm:p-4 overflow-auto bg-gradient-to-b ${isLightTheme ? 'from-slate-100 to-white' : 'from-black/50 to-black/20'}`} style={{ minHeight: "120px", maxHeight: "30vh" }}>
            <pre className={`text-xs sm:text-[13px] font-mono whitespace-pre-wrap break-words leading-relaxed ${isLightTheme ? 'text-emerald-700 selection:bg-emerald-200 selection:text-emerald-900' : 'text-emerald-400 selection:bg-emerald-900/50 selection:text-emerald-200'}`}>
              <code>{output}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
