"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { generateBioApi } from "@/lib/api/ai";
import { toast } from "sonner";

interface AIWriterButtonProps {
  role: string;
  onBioGenerated: (bio: string) => void;
}

export function AIWriterButton({ role, onBioGenerated }: AIWriterButtonProps) {
  const [open, setOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!keywords.trim()) {
      toast.error("Please enter some keywords or details");
      return;
    }
    setLoading(true);
    try {
      const res = await generateBioApi(role, keywords);
      if (res.success && res.bio) {
        onBioGenerated(res.bio);
        setOpen(false);
        setKeywords("");
        toast.success("Bio generated successfully!");
      }
    } catch (err) {
      toast.error("Failed to generate bio with AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
      >
        <Sparkles className="size-3.5" />
        AI Writer
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-500">
              <Sparkles className="size-5" /> AI Bio Writer
            </DialogTitle>
            <DialogDescription>
              Enter a few keywords about yourself, and AI will craft a professional bio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="ai-writer-keywords" className="sr-only">Keywords for bio generation</label>
            <textarea
              id="ai-writer-keywords"
              aria-label="Keywords for bio generation"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Cardiologist, 15 years experience, loves tennis, holistic care..."
              className="w-full resize-none bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all min-h-25"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 hover:bg-muted transition-colors mr-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="size-4" /> Generate Bio</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
