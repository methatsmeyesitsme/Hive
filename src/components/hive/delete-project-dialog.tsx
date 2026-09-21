import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHiveStore } from "@/lib/hive/store";

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

  return (
    <Dialog open={projectId !== null && project !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Delete project?</DialogTitle>
        <DialogDescription className="mt-1">
          {project ? `“${project.name}”` : "This project"} and its chat and page will be removed
          from this browser. This can't be undone.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="danger"
            data-testid="confirm-delete-project"
            onClick={() => {
              if (projectId) deleteProject(projectId);
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
