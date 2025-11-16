/**
 * Download utilities for Document Summarization
 * Supports TXT, PDF, and DOCX formats
 */

import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';

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

/**
 * Download summary as TXT file
 */
export const downloadAsTXT = (summary: Summary) => {
  let content = `
📘 DOCUMENT SUMMARY
==================

${summary.metadata ? `
⏱ Reading Time: ${summary.metadata.readingTime} minutes
📊 Difficulty Level: ${summary.metadata.difficultyLevel}
📉 Compression: ${summary.metadata.compression}% of original
✅ Status: ${summary.metadata.status}

` : ''}
🧠 SUMMARY
----------
${summary.summary}

📋 KEY POINTS
-------------
${summary.keyPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

🏷️ KEYWORDS
-----------
${summary.keywords.join(', ')}
`;

  if (summary.metadata?.insights && summary.metadata.insights.length > 0) {
    content += `

💡 INSIGHTS
-----------
${summary.metadata.insights.map((insight, idx) => `${idx + 1}. ${insight}`).join('\n')}`;
  }

  if (summary.metadata?.applications && summary.metadata.applications.length > 0) {
    content += `

⚙️ APPLICATIONS / USE CASES
---------------------------
${summary.metadata.applications.map((app, idx) => `${idx + 1}. ${app}`).join('\n')}`;
  }

  if (summary.metadata?.relatedLinks && summary.metadata.relatedLinks.length > 0) {
    content += `

🔗 RELATED TOPICS / USEFUL LINKS
--------------------------------
${summary.metadata.relatedLinks.map((link, idx) => `${idx + 1}. ${link.title}\n   ${link.url}`).join('\n\n')}`;
  }

  content += `

📄 ORIGINAL TEXT
----------------
${summary.originalText}

🧾 AI TRANSPARENCY NOTE
-----------------------
⚙️ Generated using AI summarization logic.
Output style adapts dynamically to the selected Summary Type.
All external links provided are for learning and reference purposes only.

---
Generated on: ${new Date(summary.createdAt).toLocaleString()}
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  saveAs(blob, `summary-${summary.id}.txt`);
};

/**
 * Download summary as PDF file
 */
export const downloadAsPDF = (summary: Summary) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 11, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
    
    yPosition += 3; // Add spacing after text block
  };

  // Title
  addText('DOCUMENT SUMMARY', 18, true, [139, 92, 246]); // Purple color
  yPosition += 5;

  // Metadata section
  if (summary.metadata) {
    addText(`Reading Time: ${summary.metadata.readingTime} minutes`, 10, false, [100, 100, 100]);
    addText(`Difficulty Level: ${summary.metadata.difficultyLevel}`, 10, false, [100, 100, 100]);
    addText(`Compression: ${summary.metadata.compression}% of original`, 10, false, [100, 100, 100]);
    addText(`Status: ${summary.metadata.status}`, 10, false, [100, 100, 100]);
    yPosition += 5;
  }

  // Summary section
  addText('SUMMARY', 14, true, [99, 102, 241]); // Indigo color
  addText(summary.summary, 11);
  yPosition += 3;

  // Key Points section
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    addText('KEY POINTS', 14, true, [99, 102, 241]);
    summary.keyPoints.forEach((point, idx) => {
      addText(`${idx + 1}. ${point}`, 11);
    });
    yPosition += 3;
  }

  // Keywords section
  if (summary.keywords && summary.keywords.length > 0) {
    addText('KEYWORDS', 14, true, [99, 102, 241]);
    addText(summary.keywords.join(', '), 11);
    yPosition += 3;
  }

  // Insights section
  if (summary.metadata?.insights && summary.metadata.insights.length > 0) {
    addText('INSIGHTS', 14, true, [99, 102, 241]);
    summary.metadata.insights.forEach((insight, idx) => {
      addText(`${idx + 1}. ${insight}`, 11);
    });
    yPosition += 3;
  }

  // Applications section
  if (summary.metadata?.applications && summary.metadata.applications.length > 0) {
    addText('APPLICATIONS / USE CASES', 14, true, [99, 102, 241]);
    summary.metadata.applications.forEach((app, idx) => {
      addText(`${idx + 1}. ${app}`, 11);
    });
    yPosition += 3;
  }

  // Related Links section
  if (summary.metadata?.relatedLinks && summary.metadata.relatedLinks.length > 0) {
    addText('RELATED TOPICS / USEFUL LINKS', 14, true, [99, 102, 241]);
    summary.metadata.relatedLinks.forEach((link, idx) => {
      addText(`${idx + 1}. ${link.title}`, 11, false, [37, 99, 235]); // Blue for links
      addText(`   ${link.url}`, 9, false, [100, 100, 100]);
    });
    yPosition += 3;
  }

  // Original Text section
  addText('ORIGINAL TEXT', 14, true, [99, 102, 241]);
  addText(summary.originalText, 10);
  yPosition += 5;

  // Footer
  addText('AI TRANSPARENCY NOTE', 12, true, [100, 100, 100]);
  addText('Generated using AI summarization logic. Output style adapts dynamically to the selected Summary Type.', 9, false, [100, 100, 100]);
  addText(`Generated on: ${new Date(summary.createdAt).toLocaleString()}`, 9, false, [100, 100, 100]);

  // Save the PDF
  doc.save(`summary-${summary.id}.pdf`);
};

/**
 * Download summary as DOCX file
 */
export const downloadAsDOCX = async (summary: Summary) => {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: 'DOCUMENT SUMMARY',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      style: 'Heading1',
    })
  );

  // Metadata section
  if (summary.metadata) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Reading Time: ', bold: true }),
          new TextRun({ text: `${summary.metadata.readingTime} minutes` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Difficulty Level: ', bold: true }),
          new TextRun({ text: summary.metadata.difficultyLevel }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Compression: ', bold: true }),
          new TextRun({ text: `${summary.metadata.compression}% of original` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun({ text: summary.metadata.status }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // Summary section
  children.push(
    new Paragraph({
      text: 'SUMMARY',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      text: summary.summary,
      spacing: { after: 300 },
    })
  );

  // Key Points section
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    children.push(
      new Paragraph({
        text: 'KEY POINTS',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      })
    );
    
    summary.keyPoints.forEach((point, idx) => {
      children.push(
        new Paragraph({
          text: `${idx + 1}. ${point}`,
          spacing: { after: 100 },
          indent: { left: 360 },
        })
      );
    });
    
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Keywords section
  if (summary.keywords && summary.keywords.length > 0) {
    children.push(
      new Paragraph({
        text: 'KEYWORDS',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: summary.keywords.join(', '),
        spacing: { after: 300 },
      })
    );
  }

  // Insights section
  if (summary.metadata?.insights && summary.metadata.insights.length > 0) {
    children.push(
      new Paragraph({
        text: 'INSIGHTS',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      })
    );
    
    summary.metadata.insights.forEach((insight, idx) => {
      children.push(
        new Paragraph({
          text: `${idx + 1}. ${insight}`,
          spacing: { after: 100 },
          indent: { left: 360 },
        })
      );
    });
    
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Applications section
  if (summary.metadata?.applications && summary.metadata.applications.length > 0) {
    children.push(
      new Paragraph({
        text: 'APPLICATIONS / USE CASES',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      })
    );
    
    summary.metadata.applications.forEach((app, idx) => {
      children.push(
        new Paragraph({
          text: `${idx + 1}. ${app}`,
          spacing: { after: 100 },
          indent: { left: 360 },
        })
      );
    });
    
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Related Links section
  if (summary.metadata?.relatedLinks && summary.metadata.relatedLinks.length > 0) {
    children.push(
      new Paragraph({
        text: 'RELATED TOPICS / USEFUL LINKS',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      })
    );
    
    summary.metadata.relatedLinks.forEach((link, idx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. ${link.title}`, bold: true }),
          ],
          spacing: { after: 50 },
          indent: { left: 360 },
        }),
        new Paragraph({
          text: link.url,
          spacing: { after: 100 },
          indent: { left: 720 },
        })
      );
    });
    
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Original Text section
  children.push(
    new Paragraph({
      text: 'ORIGINAL TEXT',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      text: summary.originalText,
      spacing: { after: 300 },
    })
  );

  // Footer
  children.push(
    new Paragraph({
      text: 'AI TRANSPARENCY NOTE',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 300, after: 200 },
    }),
    new Paragraph({
      text: 'Generated using AI summarization logic. Output style adapts dynamically to the selected Summary Type. All external links provided are for learning and reference purposes only.',
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Generated on: ', bold: true }),
        new TextRun({ text: new Date(summary.createdAt).toLocaleString() }),
      ],
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate and save the document
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `summary-${summary.id}.docx`);
};
