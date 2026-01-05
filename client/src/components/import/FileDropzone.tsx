
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  maxSizeMB?: number;
}

export function FileDropzone({ onFileSelect, maxSizeMB = 5 }: FileDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null);
      
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0].code === "file-too-large") {
            setError(`File is larger than ${maxSizeMB}MB`);
        } else {
            setError(rejection.errors[0].message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const selected = acceptedFiles[0];
        setFile(selected);
        onFileSelect(selected);
      }
    },
    [onFileSelect, maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
  };

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center border-dashed border-2 p-12 text-center transition-colors cursor-pointer hover:bg-muted/50",
        isDragActive && "border-primary bg-muted/50",
        error && "border-destructive/50 bg-destructive/5"
      )}
    >
      <input {...getInputProps()} />
      
      {file ? (
        <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-primary/10">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
            </div>
            <div className="flex items-center gap-2">
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFile} className="mt-2 text-destructive hover:text-destructive">
                Remove file
            </Button>
        </div>
      ) : (
        <>
            <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
                {isDragActive ? "Drop the file here" : "Drag & drop your file here"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
                or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
                Supported formats: CSV, XLSX, XLS (Max {maxSizeMB}MB)
            </p>
        </>
      )}
      
      {error && (
          <div className="absolute bottom-4 text-destructive text-sm font-medium">
              {error}
          </div>
      )}
    </Card>
  );
}
