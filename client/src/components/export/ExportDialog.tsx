
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileJson } from "lucide-react";
import { useFHIRFullBundle } from "@/hooks/use-export";

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { downloadBundle } = useFHIRFullBundle();

  const handleExport = async () => {
    setLoading(true);
    try {
      await downloadBundle();
      setOpen(false);
    } catch (err) {
      console.error(err);
      // Toast handled in hook? No, hook threw. catch here.
      // Need toast here or hook. 
      // For now simple console error. 
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Health Data</DialogTitle>
          <DialogDescription>
            Download your health data in standard FHIR R4 format. This file can be imported into other health applications that support the FHIR standard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
             <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                 <div className="p-2 rounded-full bg-primary/10 text-primary">
                     <FileJson className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                     <p className="font-medium">Full Health Record</p>
                     <p className="text-xs text-muted-foreground">JSON Format (FHIR Bundle)</p>
                 </div>
             </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={loading}>
              {loading ? "Generating..." : "Download Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
