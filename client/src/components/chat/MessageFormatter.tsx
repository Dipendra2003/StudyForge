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
    let inTable = false;
    let tableLines: string[] = [];
    let inDiagram = false;
    let diagramLines: string[] = [];

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

      // Detect markdown table first (higher priority)
      const trimmedLine = line.trim();
      const isTableLine = trimmedLine.includes('|') && 
                         (trimmedLine.startsWith('|') || /^\|.*\|$/.test(trimmedLine));
      
      // Detect markdown list item to prevent false positive diagrams
      const isListItem = /^\s*([\*\-]\s|\d+\.\s)/.test(line);
      
      // Detect ASCII diagram (lines with box drawing characters or arrows)
      // Exclude markdown tables and regular list items from diagram detection
      const isDiagramLine = !isTableLine && !isListItem && 
                           (/[─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║]/.test(line) || 
                            /\+--|--\+|-->|<--|<==|==>/.test(line) || 
                            (line.includes('|') && !trimmedLine.startsWith('|') && line.split('|').length > 2));
      
      // Handle diagram detection
      if (isDiagramLine && !inDiagram) {
        inDiagram = true;
        diagramLines = [line];
        continue;
      }

      if (inDiagram) {
        // Continue collecting diagram lines if they look like diagram content
        const continuesDiagram = isDiagramLine || 
                                line.trim() === '' || 
                                /^\s*[A-Za-z0-9\s\(\)]+\s*$/.test(line);
        
        if (continuesDiagram) {
          diagramLines.push(line);
          continue;
        } else {
          // End of diagram - render it
          inDiagram = false;
          const diagram = renderDiagram(diagramLines, key++);
          if (diagram) elements.push(diagram);
          diagramLines = [];
          // Process current line normally
        }
      }
      
      if (isTableLine && !inTable) {
        // Start collecting table lines
        inTable = true;
        tableLines = [line];
        continue;
      }

      if (inTable) {
        if (isTableLine) {
          tableLines.push(line);
          continue;
        } else {
          // End of table - render it
          inTable = false;
          const table = renderTable(tableLines, key++);
          if (table) elements.push(table);
          tableLines = [];
          // Process current line normally
        }
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
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim() === '-' || line.trim() === '*') {
        const indent = line.search(/\S/);
        const isAsterisk = line.trim().startsWith('*');
        const content = line.trim().substring(isAsterisk ? (line.trim() === '*' ? 1 : 2) : (line.trim() === '-' ? 1 : 2)).trim();
        const marginLeft = indent > 0 ? `${indent * 8}px` : '0px';
        
        elements.push(
          <div key={key++} className="flex gap-2.5 my-1.5 items-start" style={{ marginLeft }}>
            <span className="text-primary mt-[0.35rem] text-[0.6rem]">•</span>
            <span className="flex-1 leading-relaxed">{formatInlineText(content)}</span>
          </div>
        );
        continue;
      }

      // Numbered lists (1. item, 2. item, etc.)
      const numberedListMatch = line.trim().match(/^(\d+\.)\s(.*)/);
      if (numberedListMatch) {
        const indent = line.search(/\S/);
        const numberPrefix = numberedListMatch[1];
        const content = numberedListMatch[2].trim();
        const marginLeft = indent > 0 ? `${indent * 8}px` : '0px';
        
        elements.push(
          <div key={key++} className="flex gap-2.5 my-1.5 items-start" style={{ marginLeft }}>
            <span className="text-foreground font-semibold min-w-[1.2rem] text-right mt-0.5">{numberPrefix}</span>
            <span className="flex-1 leading-relaxed">{formatInlineText(content)}</span>
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

    // Handle unclosed table
    if (inTable && tableLines.length > 0) {
      const table = renderTable(tableLines, key++);
      if (table) elements.push(table);
    }

    // Handle unclosed diagram
    if (inDiagram && diagramLines.length > 0) {
      const diagram = renderDiagram(diagramLines, key++);
      if (diagram) elements.push(diagram);
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

  // Render ASCII diagram
  const renderDiagram = (diagramLines: string[], key: number) => {
    if (diagramLines.length === 0) return null;

    const diagramContent = diagramLines.join('\n');

    const handleCopyDiagram = async () => {
      try {
        await navigator.clipboard.writeText(diagramContent);
        setCopiedIndex(-2); // Use -2 for diagram copy
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (err) {
        console.error('Failed to copy diagram:', err);
      }
    };

    return (
      <div key={key} className="my-4 rounded-lg border border-border bg-muted/30 max-w-full">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Diagram
          </span>
          <button
            onClick={handleCopyDiagram}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            {copiedIndex === -2 ? (
              <>
                <Check className="h-3 w-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy diagram</span>
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto max-w-full">
          <pre className="p-4 bg-background/50 w-fit min-w-full">
            <code className="text-xs font-mono leading-tight whitespace-pre block">
              {diagramContent}
            </code>
          </pre>
        </div>
      </div>
    );
  };

  // Render markdown table
  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;

    // Parse table rows
    const rows = tableLines.map(line => 
      line.trim().split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '')
    );

    // First row is header
    const headers = rows[0];
    
    // Second row is separator (ignore it) - it contains :--- or similar
    // Remaining rows are data
    const dataRows = rows.slice(2).filter(row => 
      // Filter out any remaining separator-like rows
      row.length > 0 && !row.every(cell => /^:?-+:?$/.test(cell))
    );

    const handleCopyTable = async () => {
      try {
        // Create plain text version of the table
        const tableText = tableLines.join('\n');
        await navigator.clipboard.writeText(tableText);
        setCopiedIndex(-1); // Use -1 for table copy
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (err) {
        console.error('Failed to copy table:', err);
      }
    };

    return (
      <div key={key} className="my-4 rounded-lg overflow-hidden border border-border bg-muted/30">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Table
          </span>
          <button
            onClick={handleCopyTable}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            {copiedIndex === -1 ? (
              <>
                <Check className="h-3 w-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy table</span>
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-muted/50">
              <tr>
                {headers.map((header, idx) => (
                  <th 
                    key={idx} 
                    className="border border-border px-4 py-2 text-left font-semibold text-sm"
                  >
                    {formatInlineText(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td 
                      key={cellIdx} 
                      className="border border-border px-4 py-2 text-sm"
                    >
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Format inline text (bold, italics, code, math, links, emojis, etc.)
  const formatInlineText = (text: string) => {
    // Handle <bold>, **, *, `code`, $math$, and [text](url)
    const parts = text.split(/(<bold>.*?<\/bold>|\*\*.*?\*\*|\*[^*]+\*|`[^`]+`|\$[^$]+\$|\[.*?\]\(.*?\))/g);
    
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <a 
              key={index} 
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline font-medium"
            >
              {match[1]}
            </a>
          );
        }
      }
      if (part.startsWith('<bold>') && part.endsWith('</bold>')) {
        const content = part.slice(6, -7);
        return <strong key={index} className="font-semibold">{content}</strong>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={index} className="font-semibold">{content}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        const content = part.slice(1, -1);
        return <em key={index} className="italic">{content}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        const content = part.slice(1, -1);
        return <code key={index} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">{content}</code>;
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        const content = part.slice(1, -1);
        return <span key={index} className="font-serif italic text-primary font-medium">{content}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="message-content max-w-full overflow-x-hidden">
      {formatMessage(content)}
    </div>
  );
});

MessageFormatter.displayName = 'MessageFormatter';

export default MessageFormatter;
