import { Image as ImageIcon, FileText, Clipboard, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttachmentMenuProps {
  onSelectFiles: (files: FileList | File[] | null) => void;
}

export default function AttachmentMenu({ onSelectFiles }: AttachmentMenuProps) {
  const handleFileSelect = (accept: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        onSelectFiles(target.files);
      }
    };
    input.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0"
          title="Attach"
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        sideOffset={8}
        className="w-56 p-1.5 rounded-xl shadow-xl border-border/40 bg-card/95 backdrop-blur-md outline-none"
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Attach to message
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleFileSelect('image/jpeg,image/png,image/gif,image/webp')}
          className="rounded-lg cursor-pointer px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 transition-colors"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary mr-2.5 flex-shrink-0">
            <ImageIcon className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-sm">Upload Image(s)</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleFileSelect('application/pdf')}
          className="rounded-lg cursor-pointer px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 transition-colors mt-1"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary mr-2.5 flex-shrink-0">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-sm">Upload PDF(s)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
