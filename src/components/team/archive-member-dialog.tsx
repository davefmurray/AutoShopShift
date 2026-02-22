"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { archiveMember } from "@/actions/members";

interface ArchiveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onArchived: () => void;
}

export function ArchiveMemberDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  onArchived,
}: ArchiveMemberDialogProps) {
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setArchiving(true);
    setError(null);

    const result = await archiveMember(memberId);
    if (result.error) {
      setError(result.error);
      setArchiving(false);
      return;
    }

    setArchiving(false);
    onOpenChange(false);
    onArchived();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {memberName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {memberName} from the active roster and delete all
            their future shifts. Past shifts and time records will be preserved.
            You can restore this member later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={archiving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {archiving ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
