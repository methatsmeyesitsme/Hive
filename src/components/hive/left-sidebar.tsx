import {
  Folder,
  LogOut,
  PanelLeft,
  Plus,
  Settings,
  BookOpen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HiveWordmark } from "./logo";
import { useHiveStore } from "@/lib/hive/store";
import { cn } from "@/lib/utils";
import { NewProjectDialog } from "./new-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { useState } from "react";

export function LeftSidebar({
  collapsed,
  onCollapse,
  mobile,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  mobile?: boolean;
}) {
  const view = useHiveStore((s) => s.view);
  const setView = useHiveStore((s) => s.setView);
  const projects = useHiveStore((s) => s.projects);
  const activeId = useHiveStore((s) => s.activeProjectId);
  const selectProject = useHiveStore((s) => s.selectProject);
  const logout = useHiveStore((s) => s.logout);
  const sessionName = useHiveStore((s) => s.sessionName);
  const [openNew, setOpenNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const navBtn = (active: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-md px-2.5 text-sm transition-colors duration-150",
      collapsed && !mobile ? "justify-center px-0" : "",
      mobile ? "h-11" : "h-9",
      active ? "bg-navy-4 text-fog" : "text-mist hover:bg-navy-3 hover:text-fog",
    );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-line bg-navy-2",
        mobile ? "w-full" : collapsed ? "w-14" : "w-[220px]",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-line px-3",
          collapsed && !mobile ? "justify-center" : "justify-between",
        )}
      >
        <HiveWordmark collapsed={collapsed && !mobile} />
        {!mobile && (
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-fog"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>

      <div className="p-2">
        <Button
          variant="secondary"
          className={cn(
            "w-full",
            collapsed && !mobile ? "px-0" : "justify-start",
          )}
          onClick={() => setOpenNew(true)}
        >
          <Plus className="size-4" />
          {(!collapsed || mobile) && "New Project"}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {(!collapsed || mobile) && (
          <p className="mb-1 px-2 pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
            Projects
          </p>
        )}
        <ul className="space-y-0.5 pb-3">
          {projects.map((p) => (
            <li key={p.id} className="group relative">
              <button
                type="button"
                className={cn(
                  navBtn(view === "workspace" && p.id === activeId),
                  (!collapsed || mobile) && "pr-10",
                )}
                onClick={() => selectProject(p.id)}
                title={p.name}
              >
                <Folder className="size-4 shrink-0" />
                {(!collapsed || mobile) && (
                  <span className="truncate">{p.name}</span>
                )}
              </button>
              {(!collapsed || mobile) && (
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  title="Delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(p.id);
                  }}
                  className={cn(
                    "absolute right-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-md text-dim transition-opacity hover:bg-navy-4 hover:text-danger focus-visible:opacity-100",
                    mobile
                      ? "size-9"
                      : "size-7 opacity-60 group-hover:opacity-100 focus-visible:opacity-100",
                  )}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>

      <div className="mt-auto border-t border-line p-2 space-y-0.5">
        <button
          type="button"
          className={navBtn(view === "memory")}
          onClick={() => setView("memory")}
        >
          <BookOpen className="size-4 shrink-0" />
          {(!collapsed || mobile) && "Memory"}
        </button>
        <button
          type="button"
          className={navBtn(view === "settings")}
          onClick={() => setView("settings")}
        >
          <Settings className="size-4 shrink-0" />
          {(!collapsed || mobile) && "Settings"}
        </button>
        <button type="button" className={navBtn(false)} onClick={logout}>
          <LogOut className="size-4 shrink-0" />
          {(!collapsed || mobile) && (sessionName ? `Log out` : "Log out")}
        </button>
      </div>

      <NewProjectDialog open={openNew} onOpenChange={setOpenNew} />
      <DeleteProjectDialog
        projectId={deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      />
    </aside>
  );
}
