
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ImportPreview, ImportResult, ImportRow } from "@shared/types/import-export";
import { useToast } from "@/hooks/use-toast";

export function useImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadPreviewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload file");
      }
      
      return res.json() as Promise<ImportPreview>;
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmImportMutation = useMutation({
    mutationFn: async (data: { rows: ImportRow[], mergeStrategy: "skip" | "overwrite" }) => {
      const res = await apiRequest("POST", "/api/import/confirm", data);
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
       toast({
        title: "Import Successful",
        description: `Imported ${result.importedCount} records. Skipped ${result.skippedCount}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    uploadPreviewMutation,
    confirmImportMutation,
  };
}
