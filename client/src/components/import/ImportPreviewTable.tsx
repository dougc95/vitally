
import React, { useState, useEffect } from "react";
import { ImportRow, ImportValidationError } from "@shared/types/import-export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ImportPreviewTableProps {
  rows: ImportRow[];
  errors: ImportValidationError[];
  onSelectionChange: (selectedRows: ImportRow[]) => void;
}

export function ImportPreviewTable({ rows, errors, onSelectionChange }: ImportPreviewTableProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Initialize selection - select all valid rows by default
  useEffect(() => {
    const validIndices = new Set<number>();
    rows.forEach((_, index) => {
       // Check if this row has critical errors?
       // The validator separates validRows from errors.
       // But here we might receive mixed or just passed all rows?
       // The API returns { validRows, errors }.
       // If 'rows' passed here are just validRows, then all are valid.
       // If the parent passes all raw rows, we need to know which are valid.
       // Based on implementation plan, ImportPreview has `validRows`.
       // So 'rows' here are likely just the valid ones.
       validIndices.add(index);
    });
    setSelectedIndices(validIndices);
  }, [rows]);

  // Report selection up
  useEffect(() => {
    const selected = rows.filter((_, i) => selectedIndices.has(i));
    onSelectionChange(selected);
  }, [selectedIndices, rows, onSelectionChange]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const all = new Set(rows.map((_, i) => i));
      setSelectedIndices(all);
    } else {
      setSelectedIndices(new Set());
    }
  };

  const toggleRow = (index: number, checked: boolean) => {
    const next = new Set(selectedIndices);
    if (checked) next.add(index);
    else next.delete(index);
    setSelectedIndices(next);
  };

  // Helper to find errors for a row
  const getRowError = (index: number) => {
      // Logic depends on if rows passed are just valid ones or all.
      // Assuming rows = validRows. So errors here might be disjoint?
      // Wait, ImportPreview returns { validRows, errors }.
      // 'errors' are specific rows that failed.
      // So 'rows' (validRows) don't have errors.
      // However, duplicate warnings might be relevant? 
      // For now, assume 'rows' are clean.
      return null;
  };

  return (
    <div className="border rounded-md">
       <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Checkbox 
                    checked={selectedIndices.size === rows.length && rows.length > 0}
                    onCheckedChange={(c) => toggleAll(!!c)}
                />
                <span className="text-sm font-medium">Select All ({rows.length} rows)</span>
            </div>
            <div className="text-sm text-muted-foreground">
                {selectedIndices.size} selected
            </div>
       </div>
       <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
                const isSelected = selectedIndices.has(index);
                const error = getRowError(index);
                
                return (
                  <TableRow key={index} className={cn(error && "bg-destructive/10")}>
                    <TableCell>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(c) => toggleRow(index, !!c)}
                      />
                    </TableCell>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <span className="font-medium bg-secondary px-2 py-1 rounded text-xs">{row.metricCode}</span>
                    </TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.unit}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">{row.note}</TableCell>
                  </TableRow>
                );
            })}
            {rows.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No valid rows found to import.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
