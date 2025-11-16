import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Loader2, FileText, FileJson, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  children?: React.ReactNode;
}

export function ExportDialog({ children }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'anki'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/flashcards/export?format=${selectedFormat}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from Content-Disposition header or create a default one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `flashcards-${new Date().toISOString().split('T')[0]}.${selectedFormat === 'anki' ? 'txt' : selectedFormat}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `Your flashcards have been exported as ${selectedFormat.toUpperCase()}.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your flashcards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" aria-label="Export flashcards">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="export-description">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10" aria-hidden="true">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Export Flashcards</DialogTitle>
          </div>
          <DialogDescription id="export-description">
            Choose a format to export your flashcards. The file will be downloaded to your device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block" id="export-format-label">Export Format</Label>
          <RadioGroup 
            value={selectedFormat} 
            onValueChange={(value: 'csv' | 'json' | 'anki') => setSelectedFormat(value)}
            aria-labelledby="export-format-label"
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border-2 hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem value="csv" id="csv" aria-label="CSV format" />
                <Label htmlFor="csv" className="flex items-center gap-3 cursor-pointer flex-1">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">CSV</div>
                    <div className="text-xs text-muted-foreground">
                      Comma-separated values for Excel or Google Sheets
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border-2 hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem value="json" id="json" aria-label="JSON format" />
                <Label htmlFor="json" className="flex items-center gap-3 cursor-pointer flex-1">
                  <FileJson className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">JSON</div>
                    <div className="text-xs text-muted-foreground">
                      JavaScript Object Notation for developers
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border-2 hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem value="anki" id="anki" aria-label="Anki format" />
                <Label htmlFor="anki" className="flex items-center gap-3 cursor-pointer flex-1">
                  <FileText className="h-5 w-5 text-purple-600" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Anki</div>
                    <div className="text-xs text-muted-foreground">
                      Tab-separated format for Anki flashcard app
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
            aria-label="Cancel export"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            aria-label={isExporting ? "Exporting flashcards" : `Export flashcards as ${selectedFormat.toUpperCase()}`}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
