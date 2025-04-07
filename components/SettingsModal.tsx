import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface SettingsModalProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

export function SettingsModal({ prompt, onPromptChange }: SettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(prompt);

  const handleSave = () => {
    onPromptChange(tempPrompt);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generation Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Image Generation Prompt</label>
            <Textarea
              value={tempPrompt}
              onChange={(e) => setTempPrompt(e.target.value)}
              placeholder="Enter your custom prompt..."
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              Use {"{title}"} to reference the project title in your prompt.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 