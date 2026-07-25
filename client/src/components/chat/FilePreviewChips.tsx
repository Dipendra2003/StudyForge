import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewChipsProps {
  files: File[];
  onRemove: (index: number) => void;
}

export default function FilePreviewChips({ files, onRemove }: FilePreviewChipsProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 p-2 bg-card border rounded-lg flex items-center gap-2 z-10 shadow-sm animate-in fade-in slide-in-from-bottom-2 overflow-x-auto scrollbar-thin">
      {files.map((file, index) => (
        <div key={index} className="flex items-center gap-2 overflow-hidden bg-muted/50 p-1.5 rounded relative group flex-shrink-0 min-w-[120px] max-w-[200px] border">
          {file.type.startsWith('image/') ? (
            <div className="h-10 w-10 relative flex-shrink-0 rounded overflow-hidden border bg-black/5">
              <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary rounded flex-shrink-0">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col overflow-hidden pr-6">
            <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
            <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-all rounded-full shadow-sm"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
