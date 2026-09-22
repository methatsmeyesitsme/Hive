import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHiveStore } from "@/lib/hive/store";

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useHiveStore((s) => s.createProject);
  const githubConnected = useHiveStore((s) => s.githubConnected);
  const githubRepos = useHiveStore((s) => s.githubRepos);
  const createRepo = useHiveStore((s) => s.createRepo);
  const githubBusy = useHiveStore((s) => s.githubBusy);
  const [repo, setRepo] = useState("");
  const [newRepo, setNewRepo] = useState("");

  const submit = async () => {
    let repoFullName: string | null = repo || null;
    if (newRepo.trim()) {
      repoFullName = await createRepo(newRepo.trim());
    }
    createProject("New Project", repoFullName);
    setRepo("");
    setNewRepo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New project</DialogTitle>
        <DialogDescription className="mt-1">
          Open a workspace. Connect a repository in Settings if you want RO to push later.
        </DialogDescription>
        <div className="mt-4 space-y-3">
          {githubConnected && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="np-repo">Existing repository</Label>
                <select
                  id="np-repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-line bg-navy-3 px-3 text-sm text-fog"
                >
                  <option value="">None yet</option>
                  {githubRepos.map((r) => (
                    <option key={r.fullName} value={r.fullName}>
                      {r.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-new">Or create repository</Label>
                <Input
                  id="np-new"
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  placeholder="my-new-repo"
                />
              </div>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={githubBusy}>
            Open
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
