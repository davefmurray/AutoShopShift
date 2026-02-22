"use client";

import { Button } from "@/components/ui/button";
import { CheckSquare, Square, Pencil, Trash2, X } from "lucide-react";

type BulkEditToolbarProps = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDone: () => void;
};

export function BulkEditToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectNone,
  onEdit,
  onDelete,
  onDone,
}: BulkEditToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 shadow-lg">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <span className="text-sm text-muted-foreground">
          {selectedCount} of {totalCount} shift{totalCount !== 1 ? "s" : ""}{" "}
          selected
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onSelectNone}>
            <Square className="mr-1.5 h-3.5 w-3.5" />
            Select None
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
            disabled={selectedCount === 0}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={selectedCount === 0}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onDone}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
