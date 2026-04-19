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
import { useEffect, useState } from "react";
import { Spinner } from "../ui/spinner";

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description = "This action cannot be undone.",
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  const [wasLoading, setWasLoading] = useState(false);
  useEffect(() => {
    if (isPending) setWasLoading(true);
  }, [isPending]);
  useEffect(() => {
    if (!open) setWasLoading(false);
  }, [open]);
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="border-border hover:border-destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {wasLoading ? (
              <>
                <Spinner />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
