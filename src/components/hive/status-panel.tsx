import { PanelRight, Snowflake, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MAX_AGENTS_TOTAL } from "@/lib/hive/constants";
import { useHiveStore } from "@/lib/hive/store";
import { cn } from "@/lib/utils";

export function StatusPanel({
  onClose,
  onCollapse,
  mobile,
}: {
  onClose?: () => void;
  onCollapse?: () => void;
  mobile?: boolean;
}) {
  const status = useHiveStore((s) => s.status);
  const lieutenants = useHiveStore((s) => s.lieutenants);
  const agentTotal = useHiveStore((s) => s.agentTotal);
  const phase = useHiveStore((s) => s.phase);
  const fileLocks = useHiveStore((s) => s.fileLocks);
  const pauseReason = useHiveStore((s) => s.pauseReason);
  const freeze = useHiveStore((s) => s.freeze);
  const frozen = useHiveStore((s) => s.frozen);
  const audits = useHiveStore((s) => s.audits);

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-navy-2">
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.2em] text-fog">
            HIVE
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Status</p>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              type="button"
              className="rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-fog"
              onClick={onCollapse}
              aria-label="Collapse Hive status"
            >
              <PanelRight className="size-4" />
            </button>
          )}
          {mobile && onClose && (
            <button
              type="button"
              className="rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-fog"
              onClick={onClose}
              aria-label="Close status"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          {pauseReason && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
              {pauseReason}
            </div>
          )}
          {frozen && (
            <div className="rounded-lg border border-honey/30 bg-honey/10 p-3 text-xs text-honey">
              Emergency freeze is on. Start a new project to continue.
            </div>
          )}

          <ExecBlock name="MC" activity={status.mc} />
          <ExecBlock name="HRC" activity={status.hrc} />
          <ExecBlock name="RO" activity={status.ro} />

          <Separator />

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
              Active Li
            </p>
            {lieutenants.length === 0 ? (
              <p className="text-xs text-dim">No Li summoned</p>
            ) : (
              <ul className="space-y-2">
                {lieutenants.map((li) => (
                  <li key={li.letter} className="rounded-md border border-line bg-navy-3 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-honey">Li {li.letter}</span>
                      <Badge tone={li.status === "done" ? "ok" : "mist"}>{li.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-mist">{li.activity}</p>
                    <p className="mt-0.5 text-[11px] text-dim">{li.objective}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {fileLocks.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
                File locks
              </p>
              <ul className="space-y-1">
                {fileLocks.slice(0, 8).map((lock) => (
                  <li key={lock.path} className="font-mono text-[11px] text-mist">
                    {lock.path}
                    <span className="ml-2 text-dim">{lock.ownerLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
              Recent activity
            </p>
            <ul className="space-y-2">
              {audits.slice(0, 10).map((a) => (
                <li key={a.id} className="text-[11px] leading-snug text-mist">
                  <span className="font-mono text-honey/80">{a.actor}</span>
                  <span className="text-dim"> · </span>
                  {a.action}
                </li>
              ))}
              {audits.length === 0 && <li className="text-xs text-dim">Quiet.</li>}
            </ul>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-line p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-2xl tabular-nums leading-none text-fog">
              {agentTotal}
              <span className="text-sm text-dim"> / {MAX_AGENTS_TOTAL}</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-dim">
              Agents active
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={freeze}
            disabled={frozen || phase === "idle"}
            title="Emergency freeze"
          >
            <Snowflake className="size-3.5" />
            Freeze
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ExecBlock({ name, activity }: { name: string; activity: string }) {
  const live = activity !== "Standing by";
  return (
    <div>
      <p className="font-display text-xs font-semibold tracking-[0.18em] text-honey">{name}</p>
      <p
        className={cn(
          "mt-1 text-sm text-fog transition-opacity duration-300",
          live && "opacity-100",
        )}
      >
        {activity}
      </p>
    </div>
  );
}
