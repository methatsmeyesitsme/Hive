import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHiveStore } from "@/lib/hive/store";
import { useState } from "react";

export function DeleteProjectDialog({
  projectId,
  onOpenChange,
}: {
  /** The project to delete, or null when the dialog is closed. */
  projectId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const project = useHiveStore((s) => s.projects.find((p) => p.id === projectId) ?? null);
  const deleteProject = useHiveStore((s) => s.deleteProject);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setConfirming(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={projectId !== null && project !== null}
      onOpenChange={(open) => {
        if (!open) setConfirming(false);
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogTitle>{confirming ? "Confirm permanent deletion" : "Delete project?"}</DialogTitle>
        <DialogDescription className="mt-1">
          {project ? `“${project.name}”` : "This project"}{" "}
          {confirming
            ? "will be permanently removed from this browser. This cannot be undone."
            : "and its chat and page will be removed from this browser. You will get one more confirmation before it is deleted."}
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="danger"
            data-testid="confirm-delete-project"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              if (projectId) deleteProject(projectId);
              close();
            }}
          >
            {confirming ? "Yes, delete permanently" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
