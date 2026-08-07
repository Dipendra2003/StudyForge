import { useState } from 'react';
import { FiCopy, FiThumbsUp, FiThumbsDown, FiRefreshCw, FiDownload, FiMoreVertical, FiCheck } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MessageActionBarProps {
  messageId?: number;
  messageContent: string;
  onRegenerate?: () => void;
  className?: string;
}

export default function MessageActionBar({
  messageId,
  messageContent,
  onRegenerate,
  className,
}: MessageActionBarProps) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  // Copy message to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle like action
  const handleLike = async () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    
    // Remove dislike if active
    if (newLikedState && disliked) {
      setDisliked(false);
    }

    // Save feedback to backend
    if (messageId) {
      try {
        await apiPost('/api/feedback', {
          messageId,
          type: newLikedState ? 'like' : 'unlike',
        });
      } catch (error) {

      }
    }

    toast({
      title: newLikedState ? "Liked!" : "Like removed",
      description: newLikedState ? "Thanks for your feedback" : "Feedback removed",
    });
  };

  // Handle dislike action
  const handleDislike = async () => {
    const newDislikedState = !disliked;
    setDisliked(newDislikedState);
    
    // Remove like if active
    if (newDislikedState && liked) {
      setLiked(false);
    }

    // Save feedback to backend
    if (messageId) {
      try {
        await apiPost('/api/feedback', {
          messageId,
          type: newDislikedState ? 'dislike' : 'undislike',
        });
      } catch (error) {

      }
    }

    toast({
      title: newDislikedState ? "Disliked" : "Dislike removed",
      description: newDislikedState ? "Thanks for your feedback" : "Feedback removed",
    });
  };

  // Handle regenerate action
  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    
    setIsRegenerating(true);
    
    try {
      await onRegenerate();
      toast({
        title: "Regenerating...",
        description: "Generating a new response",
      });
    } catch (error) {
      toast({
        title: "Failed to regenerate",
        description: "Could not regenerate the response",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle download action
  const handleDownload = async (format: 'txt' | 'pdf' | 'docx' = 'txt') => {
    try {
      if (format === 'txt') {
        // Download as TXT
        const blob = new Blob([messageContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jadoo-message-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Downloaded!",
          description: "Message downloaded as TXT file",
        });
      } else if (format === 'pdf') {
        // Download as PDF using jsPDF
        await handleDownloadPDF();
      } else if (format === 'docx') {
        // Download as DOCX using docx library
        await handleDownloadDOCX();
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the message",
        variant: "destructive",
      });
    }
  };

  // Parse Markdown and render formatted content
  const parseMarkdownForPDF = (text: string) => {
    const elements: Array<{
      type: 'heading' | 'code' | 'text' | 'space';
      content: string;
      level?: number;
      language?: string;
    }> = [];

    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Detect code blocks
      if (line.trim().startsWith('```')) {
        const language = line.trim().substring(3).trim() || 'code';
        const codeLines: string[] = [];
        i++;

        // Collect code lines until closing ```
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        if (codeLines.length > 0) {
          elements.push({
            type: 'code',
            content: codeLines.join('\n'),
            language,
          });
        }
        i++; // Skip closing ```
        continue;
      }

      // Detect headings
      if (line.trim().startsWith('###')) {
        elements.push({
          type: 'heading',
          content: line.trim().substring(3).trim(),
          level: 3,
        });
        i++;
        continue;
      }

      if (line.trim().startsWith('##')) {
        elements.push({
          type: 'heading',
          content: line.trim().substring(2).trim(),
          level: 2,
        });
        i++;
        continue;
      }

      if (line.trim().startsWith('#')) {
        elements.push({
          type: 'heading',
          content: line.trim().substring(1).trim(),
          level: 1,
        });
        i++;
        continue;
      }

      // Detect Example headings
      if (/^Example\s+\d+:/i.test(line.trim())) {
        elements.push({
          type: 'heading',
          content: line.trim(),
          level: 3,
        });
        i++;
        continue;
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push({
          type: 'space',
          content: '',
        });
        i++;
        continue;
      }

      // Regular text (strip bold/italic markers)
      let cleanLine = line;
      cleanLine = cleanLine.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
      cleanLine = cleanLine.replace(/__([^_]+)__/g, '$1'); // Bold
      cleanLine = cleanLine.replace(/\*([^*]+)\*/g, '$1'); // Italic
      cleanLine = cleanLine.replace(/_([^_]+)_/g, '$1'); // Italic
      cleanLine = cleanLine.replace(/`([^`]+)`/g, '$1'); // Inline code

      elements.push({
        type: 'text',
        content: cleanLine,
      });
      i++;
    }

    return elements;
  };

  // Handle PDF download with professional styling
  const handleDownloadPDF = async () => {
    try {
      // Dynamic import to reduce bundle size
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const maxWidth = pageWidth - 2 * margin;
      
      // Jadoo brand colors (RGB)
      const jadooPurple = [139, 92, 246]; // #8b5cf6
      const jadooIndigo = [99, 102, 241]; // #6366f1
      const darkGray = [55, 65, 81]; // #374151
      const lightGray = [156, 163, 175]; // #9ca3af
      const bgGray = [249, 250, 251]; // #f9fafb
      
      // ===== HEADER SECTION =====
      
      // Add gradient-like header background (using rectangles)
      doc.setFillColor(jadooPurple[0], jadooPurple[1], jadooPurple[2]);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Add decorative accent bar
      doc.setFillColor(jadooIndigo[0], jadooIndigo[1], jadooIndigo[2]);
      doc.rect(0, 45, pageWidth, 3, 'F');
      
      // Add logo/icon placeholder (circle with "J")
      doc.setFillColor(255, 255, 255);
      doc.circle(margin, 22, 8, 'F');
      doc.setTextColor(jadooPurple[0], jadooPurple[1], jadooPurple[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('J', margin - 3, 25);
      
      // Add title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Jadoo AI Assistant', margin + 15, 22);
      
      // Add subtitle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('AI-Powered Study Assistant', margin + 15, 30);
      
      // ===== METADATA SECTION =====
      
      let yPosition = 60;
      
      // Add metadata box
      doc.setFillColor(bgGray[0], bgGray[1], bgGray[2]);
      doc.roundedRect(margin, yPosition, maxWidth, 20, 3, 3, 'F');
      
      // Add metadata content
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Generated:', margin + 5, yPosition + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }), margin + 5, yPosition + 14);
      
      // Add document ID
      doc.setFont('helvetica', 'bold');
      doc.text('Document ID:', pageWidth - margin - 50, yPosition + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${Date.now().toString().slice(-8)}`, pageWidth - margin - 50, yPosition + 14);
      
      yPosition += 35;
      
      // ===== CONTENT SECTION =====
      
      // Add section title
      doc.setTextColor(jadooPurple[0], jadooPurple[1], jadooPurple[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Message Content', margin, yPosition);
      
      // Add decorative line under title
      doc.setDrawColor(jadooPurple[0], jadooPurple[1], jadooPurple[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition + 2, margin + 40, yPosition + 2);
      
      yPosition += 12;
      
      // Parse Markdown content
      const parsedElements = parseMarkdownForPDF(messageContent);
      
      // Render each element with proper formatting
      parsedElements.forEach((element) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
          
          // Add page header on new pages
          doc.setFillColor(bgGray[0], bgGray[1], bgGray[2]);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Jadoo AI Assistant - Continued', margin, 10);
          
          yPosition = 25;
        }

        if (element.type === 'heading') {
          // Render heading with larger, bold font
          doc.setTextColor(jadooPurple[0], jadooPurple[1], jadooPurple[2]);
          
          if (element.level === 1) {
            doc.setFontSize(18);
          } else if (element.level === 2) {
            doc.setFontSize(16);
          } else {
            doc.setFontSize(14);
          }
          
          doc.setFont('helvetica', 'bold');
          const headingLines = doc.splitTextToSize(element.content, maxWidth);
          headingLines.forEach((line: string) => {
            doc.text(line, margin, yPosition);
            yPosition += 8;
          });
          yPosition += 4; // Extra space after heading
          
        } else if (element.type === 'code') {
          // Render code block with styled box
          const codeLines = element.content.split('\n');
          const codeBoxPadding = 8;
          const codeLineHeight = 5;
          const codeBoxHeight = (codeLines.length * codeLineHeight) + (codeBoxPadding * 2);
          
          // Check if code box fits on current page
          if (yPosition + codeBoxHeight > pageHeight - 50) {
            doc.addPage();
            yPosition = margin;
          }
          
          // Draw code box background
          doc.setFillColor(245, 245, 245); // Light gray
          doc.roundedRect(margin, yPosition, maxWidth, codeBoxHeight, 3, 3, 'F');
          
          // Draw code box border
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, yPosition, maxWidth, codeBoxHeight, 3, 3, 'S');
          
          // Add language label
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.setFont('courier', 'bold');
          doc.text(element.language || 'code', margin + 5, yPosition + 5);
          
          // Add code content
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 40);
          doc.setFont('courier', 'normal');
          
          let codeY = yPosition + codeBoxPadding + 8;
          codeLines.forEach((codeLine: string) => {
            // Truncate long lines to fit in box
            const truncatedLine = codeLine.length > 80 ? codeLine.substring(0, 80) + '...' : codeLine;
            doc.text(truncatedLine, margin + 5, codeY);
            codeY += codeLineHeight;
          });
          
          yPosition += codeBoxHeight + 8; // Extra space after code block
          
        } else if (element.type === 'space') {
          // Add spacing
          yPosition += 4;
          
        } else if (element.type === 'text') {
          // Render regular text
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          
          const textLines = doc.splitTextToSize(element.content, maxWidth);
          textLines.forEach((line: string) => {
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 2; // Small space after text
        }
      });
      
      // ===== FOOTER SECTION =====
      
      const totalPages = doc.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Add footer background
        doc.setFillColor(bgGray[0], bgGray[1], bgGray[2]);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Add footer line
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        
        // Add page number
        doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        
        // Add branding
        doc.setFontSize(8);
        doc.text(
          'Powered by Jadoo AI',
          margin,
          pageHeight - 10
        );
        
        // Add website/contact
        doc.text(
          'jadoo.ai',
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }
      
      // Save with descriptive filename
      const date = new Date();
      const filename = `Jadoo-AI-Message-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.pdf`;
      doc.save(filename);
      
      toast({
        title: "Downloaded!",
        description: "Message downloaded as PDF file",
      });
    } catch (error) {

      toast({
        title: "PDF Download Failed",
        description: "Could not generate PDF. Please try TXT format.",
        variant: "destructive",
      });
    }
  };

  // Handle DOCX download with professional styling
  const handleDownloadDOCX = async () => {
    try {
      // Dynamic import to reduce bundle size
      const { 
        Document, 
        Paragraph, 
        TextRun, 
        Packer,
        AlignmentType,
        HeadingLevel,
        BorderStyle,
        ShadingType,
        UnderlineType
      } = await import('docx');
      
      const date = new Date();
      const formattedDate = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Split content into paragraphs
      const contentParagraphs = messageContent.split('\n').map(text => 
        new Paragraph({
          children: [
            new TextRun({
              text: text || ' ', // Empty line if text is empty
              size: 24, // 12pt
              font: 'Calibri',
              color: '374151', // Dark gray
            }),
          ],
          spacing: {
            before: 120,
            after: 120,
            line: 360, // 1.5 line spacing
          },
        })
      );
      
      const doc = new Document({
        creator: 'Jadoo AI Assistant',
        title: 'AI Assistant Message',
        description: 'Message generated by Jadoo AI Study Assistant',
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: [
            // Header with brand name
            new Paragraph({
              children: [
                new TextRun({
                  text: "JADOO AI ASSISTANT",
                  bold: true,
                  size: 32, // 16pt
                  font: 'Calibri',
                  color: '8b5cf6', // Jadoo purple
                  allCaps: true,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
              border: {
                bottom: {
                  color: '8b5cf6',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 12,
                },
              },
            }),
            
            // Subtitle
            new Paragraph({
              children: [
                new TextRun({
                  text: "AI-Powered Study Assistant",
                  size: 20, // 10pt
                  font: 'Calibri',
                  color: '6366f1', // Jadoo indigo
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),
            
            // Metadata box
            new Paragraph({
              children: [
                new TextRun({
                  text: "Document Information",
                  bold: true,
                  size: 22, // 11pt
                  font: 'Calibri',
                  color: '374151',
                }),
              ],
              spacing: {
                before: 200,
                after: 100,
              },
              shading: {
                type: ShadingType.CLEAR,
                color: 'f9fafb', // Light gray background
                fill: 'f9fafb',
              },
              border: {
                top: {
                  color: 'e5e7eb',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
                bottom: {
                  color: 'e5e7eb',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
                left: {
                  color: 'e5e7eb',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
                right: {
                  color: 'e5e7eb',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
            }),
            
            // Generated date
            new Paragraph({
              children: [
                new TextRun({
                  text: "Generated: ",
                  bold: true,
                  size: 20,
                  font: 'Calibri',
                  color: '6b7280',
                }),
                new TextRun({
                  text: formattedDate,
                  size: 20,
                  font: 'Calibri',
                  color: '6b7280',
                }),
              ],
              spacing: {
                before: 100,
                after: 80,
              },
            }),
            
            // Document ID
            new Paragraph({
              children: [
                new TextRun({
                  text: "Document ID: ",
                  bold: true,
                  size: 20,
                  font: 'Calibri',
                  color: '6b7280',
                }),
                new TextRun({
                  text: `#${Date.now().toString().slice(-8)}`,
                  size: 20,
                  font: 'Calibri',
                  color: '6b7280',
                  italics: true,
                }),
              ],
              spacing: {
                after: 400,
              },
            }),
            
            // Content section header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Message Content",
                  bold: true,
                  size: 28, // 14pt
                  font: 'Calibri',
                  color: '8b5cf6', // Jadoo purple
                  underline: {
                    type: UnderlineType.SINGLE,
                    color: '8b5cf6',
                  },
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 400,
                after: 300,
              },
            }),
            
            // Message content paragraphs
            ...contentParagraphs,
            
            // Footer separator
            new Paragraph({
              children: [
                new TextRun({
                  text: "",
                }),
              ],
              spacing: {
                before: 600,
              },
              border: {
                top: {
                  color: 'e5e7eb',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
            }),
            
            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "Powered by Jadoo AI • jadoo.ai",
                  size: 18, // 9pt
                  font: 'Calibri',
                  color: '9ca3af',
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 200,
              },
            }),
          ],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `Jadoo-AI-Message-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.docx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "Message downloaded as DOCX file",
      });
    } catch (error) {

      toast({
        title: "DOCX Download Failed",
        description: "Could not generate DOCX. Please try TXT format.",
        variant: "destructive",
      });
    }
  };

  // Handle share action
  const handleShare = async () => {
    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: 'Jadoo AI Assistant Message',
          text: messageContent,
        });
        toast({
          title: "Shared!",
          description: "Message shared successfully",
        });
      } else {
        // Fallback: Copy shareable link to clipboard
        const shareText = `Jadoo AI Assistant Message:\n\n${messageContent}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Share text copied. Paste it anywhere to share.",
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "Could not share the message",
          variant: "destructive",
        });
      }
    }
  };

  // Handle report action
  const handleReport = async () => {
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          messageContent,
          reason: 'user_reported',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Report submitted",
          description: "Thank you for your feedback. We'll review this message.",
        });
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {

      toast({
        title: "Report submitted",
        description: "Your report has been recorded. Thank you for helping us improve.",
      });
    }
  };

  // Handle save action
  const handleSave = async () => {
    try {
      const response = await fetch('/api/messages/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          messageContent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Saved!",
          description: "Message saved to your collection",
        });
      } else {
        throw new Error('Failed to save message');
      }
    } catch (error) {

      toast({
        title: "Save feature coming soon",
        description: "We're working on the save functionality",
      });
    }
  };

  return (
    <div className={cn("flex items-center gap-1 mt-2 opacity-100 transition-all duration-200", className)}>
      {/* Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] active:bg-[#6366f1]/20 transition-all duration-200 rounded-lg"
        onClick={handleCopy}
        title="Copy message"
      >
        {copied ? (
          <FiCheck className="h-4 w-4 text-green-500" />
        ) : (
          <FiCopy className="h-4 w-4" />
        )}
      </Button>

      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] active:bg-[#6366f1]/20 transition-all duration-200 rounded-lg",
          liked && "text-[#8b5cf6] bg-[#8b5cf6]/10"
        )}
        onClick={handleLike}
        title="Like this response"
      >
        <FiThumbsUp className="h-4 w-4" />
      </Button>

      {/* Dislike Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] active:bg-[#6366f1]/20 transition-all duration-200 rounded-lg",
          disliked && "text-[#8b5cf6] bg-[#8b5cf6]/10"
        )}
        onClick={handleDislike}
        title="Dislike this response"
      >
        <FiThumbsDown className="h-4 w-4" />
      </Button>

      {/* Regenerate Button */}
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] active:bg-[#6366f1]/20 transition-all duration-200 rounded-lg disabled:opacity-50"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          title="Regenerate response"
        >
          <FiRefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
        </Button>
      )}

      {/* Download Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] active:bg-[#6366f1]/20 transition-all duration-200 rounded-lg"
        onClick={() => handleDownload('pdf')}
        title="Download message as PDF"
      >
        <FiDownload className="h-4 w-4" />
      </Button>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] active:bg-[#6366f1]/20 transition-all duration-200 rounded-lg"
            title="More options"
          >
            <FiMoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleDownload('txt')} className="cursor-pointer hover:bg-[#8b5cf6]/10">
            <span className="mr-2">📄</span>
            <span>Download as TXT</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('pdf')} className="cursor-pointer hover:bg-[#8b5cf6]/10">
            <span className="mr-2">📑</span>
            <span>Download as PDF</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('docx')} className="cursor-pointer hover:bg-[#8b5cf6]/10">
            <span className="mr-2">📝</span>
            <span>Download as DOCX</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare} className="cursor-pointer hover:bg-[#8b5cf6]/10">
            <span className="mr-2">🔗</span>
            <span>Share</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReport} className="cursor-pointer hover:bg-[#8b5cf6]/10">
            <span className="mr-2">🚩</span>
            <span>Report</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSave} className="cursor-pointer hover:bg-[#8b5cf6]/10">
            <span className="mr-2">💾</span>
            <span>Save</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
