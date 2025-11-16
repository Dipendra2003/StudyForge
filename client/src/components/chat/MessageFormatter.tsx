import { memo, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MessageFormatterProps {
  content: string;
}

const MessageFormatter = memo(({ content }: MessageFormatterProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Parse and format the message content
  const formatMessage = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLanguage = '';
    let codeBlockIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect code block start/end
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3).trim();
          codeLines = [];
        } else {
          // Ending a code block - render it
          inCodeBlock = false;
          const codeContent = codeLines.join('\n');
          const currentIndex = codeBlockIndex++;
          
          elements.push(
            <div key={key++} className="my-4 rounded-lg overflow-hidden border border-border bg-muted/30">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  {codeLanguage || 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(codeContent, currentIndex)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                >
                  {copiedIndex === currentIndex ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className={`language-${codeLanguage || 'plaintext'} text-sm`}>
                  {codeContent}
                </code>
              </pre>
            </div>
          );
          codeLines = [];
          codeLanguage = '';
        }
        continue;
      }

      // If inside code block, collect lines
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Skip empty lines but add spacing
      if (line.trim() === '') {
        elements.push(<div key={key++} className="h-3" />);
        continue;
      }

      // Markdown headings (### Heading)
      if (line.trim().startsWith('###')) {
        const content = line.trim().substring(3).trim();
        elements.push(
          <h3 key={key++} className="font-bold text-lg mt-6 mb-3 first:mt-0">
            {content}
          </h3>
        );
        continue;
      }

      // Markdown headings (## Heading)
      if (line.trim().startsWith('##')) {
        const content = line.trim().substring(2).trim();
        elements.push(
          <h2 key={key++} className="font-bold text-xl mt-6 mb-3 first:mt-0">
            {content}
          </h2>
        );
        continue;
      }

      // Markdown headings (# Heading)
      if (line.trim().startsWith('#')) {
        const content = line.trim().substring(1).trim();
        elements.push(
          <h1 key={key++} className="font-bold text-2xl mt-6 mb-3 first:mt-0">
            {content}
          </h1>
        );
        continue;
      }

      // Numbered emoji headings (1️⃣, 2️⃣, 3️⃣, etc.)
      if (/^[0-9]️⃣/.test(line)) {
        elements.push(
          <h3 key={key++} className="font-bold text-base mt-4 mb-2 first:mt-0">
            {line}
          </h3>
        );
        continue;
      }

      // Example headings (Example 1:, Example 2:, etc.)
      if (/^Example\s+\d+:/i.test(line.trim())) {
        elements.push(
          <h3 key={key++} className="font-bold text-base mt-6 mb-3 first:mt-0">
            {line.trim()}
          </h3>
        );
        continue;
      }

      // Bullet points with proper indentation
      if (line.trim().startsWith('-')) {
        const indent = line.search(/\S/);
        const content = line.trim().substring(1).trim();
        const marginLeft = indent > 0 ? `${indent * 8}px` : '0px';
        
        elements.push(
          <div key={key++} className="flex gap-2 my-1" style={{ marginLeft }}>
            <span className="text-muted-foreground mt-1.5">•</span>
            <span className="flex-1">{formatInlineText(content)}</span>
          </div>
        );
        continue;
      }

      // Regular paragraphs
      elements.push(
        <p key={key++} className="my-2 leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    }

    // Handle unclosed code block
    if (inCodeBlock && codeLines.length > 0) {
      const codeContent = codeLines.join('\n');
      const currentIndex = codeBlockIndex++;
      
      elements.push(
        <div key={key++} className="my-4 rounded-lg overflow-hidden border border-border bg-muted/30">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">
              {codeLanguage || 'code'}
            </span>
            <button
              onClick={() => handleCopyCode(codeContent, currentIndex)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              {copiedIndex === currentIndex ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className={`language-${codeLanguage || 'plaintext'} text-sm`}>
              {codeContent}
            </code>
          </pre>
        </div>
      );
    }

    return elements;
  };

  // Format inline text (bold, emojis, etc.)
  const formatInlineText = (text: string) => {
    // Handle both <bold>text</bold> and **text** patterns
    const parts = text.split(/(<bold>.*?<\/bold>|\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('<bold>') && part.endsWith('</bold>')) {
        const content = part.slice(6, -7);
        return <strong key={index} className="font-semibold">{content}</strong>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index} className="font-semibold">{content}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="message-content">
      {formatMessage(content)}
    </div>
  );
});

MessageFormatter.displayName = 'MessageFormatter';

export default MessageFormatter;
