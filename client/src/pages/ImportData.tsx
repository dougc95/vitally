
import React, { useState } from "react";
import { useImport } from "@/hooks/use-import";
import { ImportRow, ImportPreview } from "@shared/types/import-export";
import { FileDropzone } from "@/components/import/FileDropzone";
import { ImportPreviewTable } from "@/components/import/ImportPreviewTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle, UploadCloud, AlertTriangle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "wouter";

export default function ImportData() {
  const { uploadPreviewMutation, confirmImportMutation } = useImport();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<ImportRow[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<"skip" | "overwrite">("skip");

  const handleFileSelect = (file: File) => {
    uploadPreviewMutation.mutate(file, {
      onSuccess: (data) => {
        setPreviewData(data);
        setStep(2);
      },
    });
  };

  const handleConfirm = () => {
    if (!previewData) return;
    
    confirmImportMutation.mutate({
      rows: selectedRows,
      mergeStrategy,
    }, {
      onSuccess: () => {
        // Redirect to dashboard after short delay?
        setTimeout(() => setLocation("/home/dashboard"), 1500);
      }
    });
  };

  const reset = () => {
      setStep(1);
      setPreviewData(null);
      setSelectedRows([]);
      setMergeStrategy("skip");
  };

  if (confirmImportMutation.isSuccess) {
      return (
          <div className="container max-w-2xl py-10">
              <Card className="text-center pt-10 pb-10">
                  <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-green-100 text-green-600">
                          <CheckCircle className="w-12 h-12" />
                      </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">Import Successful!</CardTitle>
                  <CardDescription>
                      Your data has been successfully imported. Redirecting to dashboard...
                  </CardDescription>
                  <div className="mt-6">
                       <Button onClick={() => setLocation("/home/dashboard")}>
                           Go to Dashboard
                       </Button>
                  </div>
              </Card>
          </div>
      );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(s => s-1 as any) : setLocation("/home/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
      </div>

      <div className="grid gap-6">
          {/* Progress or Steps Indicator could go here */}
          
          {step === 1 && (
             <Card>
                <CardHeader>
                    <CardTitle>Upload File</CardTitle>
                    <CardDescription>
                        Select a CSV or Excel file to import your measurements.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {uploadPreviewMutation.isPending ? (
                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">Uploading and parsing file...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <FileDropzone onFileSelect={handleFileSelect} />
                            
                            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                                <p className="font-medium mb-1">About Import:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Supported formats: .csv, .xlsx, .xls</li>
                                    <li>Expected columns: Date, Metric, Value, Unit, Note</li>
                                    <li>Dates should be in YYYY-MM-DD format</li>
                                    <li>Duplicate entries are skipped by default</li>
                                </ul>
                                <Button variant="ghost" className="p-0 h-auto mt-2 text-primary" onClick={() => window.open("/api/import/template", "_blank")}>
                                    Download Template CSV
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
             </Card>
          )}

          {step === 2 && previewData && (
              <Card>
                  <CardHeader>
                      <CardTitle>Preview Data</CardTitle>
                      <CardDescription>
                          Review the data parsed from <strong>{previewData.fileName}</strong>.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                           <div className="border rounded p-3 text-center">
                               <div className="text-2xl font-bold">{previewData.totalRows}</div>
                               <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Rows</div>
                           </div>
                           <div className="border rounded p-3 text-center bg-green-50/50">
                               <div className="text-2xl font-bold text-green-600">{previewData.validRows.length}</div>
                               <div className="text-xs text-muted-foreground uppercase tracking-wider">Valid</div>
                           </div>
                           <div className="border rounded p-3 text-center bg-red-50/50">
                               <div className="text-2xl font-bold text-destructive">{previewData.errors.length}</div>
                               <div className="text-xs text-muted-foreground uppercase tracking-wider">Errors</div>
                           </div>
                      </div>

                      {previewData.errors.length > 0 && (
                          <Alert variant="destructive">
                              <AlertCircle className="w-4 h-4" />
                              <AlertTitle>Validation Errors Found</AlertTitle>
                              <AlertDescription>
                                  {previewData.errors.length} rows have errors and will be ignored. Check the table below.
                              </AlertDescription>
                          </Alert>
                      )}

                      <ImportPreviewTable 
                        rows={previewData.validRows} 
                        errors={previewData.errors} 
                        onSelectionChange={setSelectedRows} 
                      />

                      <div className="flex justify-between items-center pt-4 border-t">
                           <Button variant="outline" onClick={reset}>Cancel</Button>
                           <Button onClick={() => setStep(3)} disabled={selectedRows.length === 0}>
                               Continue ({selectedRows.length})
                           </Button>
                      </div>
                  </CardContent>
              </Card>
          )}
          
          {step === 3 && (
              <Card>
                  <CardHeader>
                      <CardTitle>Confirm Import</CardTitle>
                      <CardDescription>
                          Choose how to handle duplicate records.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label>Merge Strategy</Label>
                            <Select value={mergeStrategy} onValueChange={(v: any) => setMergeStrategy(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="skip">Skip duplicates (Keep existing data)</SelectItem>
                                    <SelectItem value="overwrite">Overwrite duplicates (Update with new data)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {mergeStrategy === "skip" 
                                    ? "Any imported measurements that match an existing date and metric will be ignored." 
                                    : "Existing measurements for the same date and metric will be updated with the new values."}
                            </p>
                          </div>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Ready to import</AlertTitle>
                        <AlertDescription>
                            You are about to import <strong>{selectedRows.length}</strong> measurements. This action supports undo in case of overwrite? No, not yet.
                        </AlertDescription>
                      </Alert>

                      <div className="flex justify-between items-center pt-4 border-t">
                           <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                           <Button onClick={handleConfirm} disabled={confirmImportMutation.isPending}>
                               {confirmImportMutation.isPending && (
                                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                               )}
                               Import Data
                           </Button>
                      </div>
                  </CardContent>
              </Card>
          )}
      </div>
    </div>
  );
}
