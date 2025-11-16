import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Study Mode",
    shortcuts: [
      { keys: ["Space", "Enter"], description: "Reveal answer" },
      { keys: ["←"], description: "Previous card" },
      { keys: ["→"], description: "Next card" },
      { keys: ["1"], description: "Mark as incorrect" },
      { keys: ["2"], description: "Mark as correct" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Tab"], description: "Move to next element" },
      { keys: ["Shift", "Tab"], description: "Move to previous element" },
      { keys: ["Enter"], description: "Activate button or link" },
      { keys: ["Esc"], description: "Close dialog or modal" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["Alt", "S"], description: "Skip to main content" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
];

export function KeyboardShortcutsHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="View keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" aria-describedby="shortcuts-description">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10" aria-hidden="true">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription id="shortcuts-description">
            Use these keyboard shortcuts to navigate and interact with flashcards more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4" role="list">
          {shortcutGroups.map((group) => (
            <div key={group.title} role="listitem">
              <h3 className="font-semibold text-lg mb-3" id={`${group.title.toLowerCase().replace(' ', '-')}-shortcuts`}>
                {group.title}
              </h3>
              <div className="space-y-2" role="list" aria-labelledby={`${group.title.toLowerCase().replace(' ', '-')}-shortcuts`}>
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                    role="listitem"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex gap-1" role="group" aria-label={`Keys: ${shortcut.keys.join(' + ')}`}>
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm"
                          aria-label={key}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg" role="note">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Tab</kbd> to navigate through interactive elements and <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Enter</kbd> to activate them.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
