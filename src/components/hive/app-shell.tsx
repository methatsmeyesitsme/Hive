import { Menu, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { LeftSidebar } from "./left-sidebar";
import { ChatWorkspace } from "./chat";
import { StatusPanel } from "./status-panel";
import { SettingsView } from "./settings";
import { MemoryView } from "./memory";
import { PreviewDialog } from "./preview";
import { Welcome } from "./welcome";
import { startModelPreload } from "@/lib/hive/local-model";
import { useHiveStore } from "@/lib/hive/store";
import { HiveMark } from "./logo";
import { cn } from "@/lib/utils";

export function AppShell() {
  const hydrated = useHiveStore((s) => s.hydrated);
  const sessionName = useHiveStore((s) => s.sessionName);
  const view = useHiveStore((s) => s.view);
  const leftCollapsed = useHiveStore((s) => s.leftCollapsed);
  const rightCollapsed = useHiveStore((s) => s.rightCollapsed);
  const toggleLeft = useHiveStore((s) => s.toggleLeft);
  const openLeft = useHiveStore((s) => s.openLeft);
  const toggleRight = useHiveStore((s) => s.toggleRight);
  const openRight = useHiveStore((s) => s.openRight);
  const leftOpenMobile = useHiveStore((s) => s.leftOpenMobile);
  const rightOpenMobile = useHiveStore((s) => s.rightOpenMobile);
  const setLeftOpenMobile = useHiveStore((s) => s.setLeftOpenMobile);
  const setRightOpenMobile = useHiveStore((s) => s.setRightOpenMobile);
  const checkAi = useHiveStore((s) => s.checkAi);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mark = () => {
      if (!useHiveStore.getState().hydrated) {
        useHiveStore.setState({ hydrated: true });
      }
    };
    const unsub = useHiveStore.persist.onFinishHydration(mark);
    if (useHiveStore.persist.hasHydrated()) mark();
    const t = window.setTimeout(mark, 50);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    void checkAi();
  }, [checkAi]);

  // Open the on-device model in the background as soon as there is a workspace, so the
  // download and start-up overlap with the person typing instead of following their request.
  useEffect(() => {
    if (hydrated && sessionName) startModelPreload();
  }, [hydrated, sessionName]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-navy text-honey">
        <HiveMark className="size-10" />
        <p className="font-display text-sm font-semibold tracking-[0.22em] text-fog">HIVE</p>
      </div>
    );
  }

  if (!sessionName) return <Welcome />;

  const openRight = () => {
    if (narrow) setRightOpenMobile(true);
    else openRight();
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-navy text-fog">
      {!narrow && (
        <LeftSidebar collapsed={leftCollapsed} onCollapse={toggleLeft} />
      )}

      {!narrow && leftCollapsed && (
        <button
          type="button"
          className="fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-lg border border-line bg-navy-2 text-mist shadow-panel hover:bg-navy-3 hover:text-fog"
          onClick={openLeft}
          aria-label="Open menu"
          title="Open menu"
        >
          <Menu className="size-6" />
        </button>
      )}

      {!narrow && rightCollapsed && (
        <button
          type="button"
          className="fixed right-4 top-5 z-50 flex size-12 items-center justify-center rounded-lg border border-line bg-navy-2 text-mist shadow-panel hover:bg-navy-3 hover:text-fog"
          onClick={toggleRight}
          aria-label="Open Hive status"
          title="Open Hive status"
        >
          <Radio className="size-6" />
        </button>
      )}

      {narrow && leftOpenMobile && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-[min(100%,280px)] bg-navy-2 shadow-panel">
            <LeftSidebar collapsed={false} onCollapse={() => setLeftOpenMobile(false)} mobile />
          </div>
          <button
            type="button"
            className="flex-1 bg-navy/60"
            aria-label="Close menu"
            onClick={() => setLeftOpenMobile(false)}
          />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {narrow && (
          <div className="flex h-12 items-center justify-between border-b border-line px-2">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-md text-mist hover:bg-navy-3 hover:text-fog"
              onClick={() => setLeftOpenMobile(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-display text-xs tracking-[0.18em]">HIVE</span>
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-md text-mist hover:bg-navy-3 hover:text-fog"
              onClick={() => setRightOpenMobile(true)}
              aria-label="Open Hive status"
            >
              <Radio className="size-5" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            {view === "settings" ? (
              <SettingsView />
            ) : view === "memory" ? (
              <MemoryView />
            ) : (
              <ChatWorkspace onOpenStatus={openRight} />
            )}
          </div>

          {!narrow && (
            <div
              className={cn(
                "shrink-0 transition-[width] duration-200 ease-out",
                rightCollapsed ? "w-0 overflow-hidden" : "w-[280px]",
              )}
            >
              {!rightCollapsed && (
                <StatusPanel onCollapse={toggleRight} />
              )}
            </div>
          )}
        </div>
      </main>

      {narrow && rightOpenMobile && (
        <div className="fixed inset-0 z-40 flex">
          <button
            type="button"
            className="flex-1 bg-navy/60"
            aria-label="Close status"
            onClick={() => setRightOpenMobile(false)}
          />
          <div className="h-full w-[min(100%,320px)] shadow-panel">
            <StatusPanel mobile onClose={() => setRightOpenMobile(false)} />
          </div>
        </div>
      )}

      <PreviewDialog />
    </div>
  );
}
