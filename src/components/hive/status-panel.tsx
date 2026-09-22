import { useEffect, useState, useSyncExternalStore } from "react";
import { PanelRight, Snowflake, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { auditDurationMs, hasOpenAudit } from "@/lib/hive/audit-log";
import { MAX_AGENTS_TOTAL, MAX_SPLITTERS, MODEL_CLASS } from "@/lib/hive/constants";
import { formatDuration } from "@/lib/hive/duration";
import { describeModelStatus, getModelStatus, subscribeModelStatus } from "@/lib/hive/local-model";
import { perf, perfRows } from "@/lib/hive/perf";
import { useHiveStore } from "@/lib/hive/store";
import type { AuditEvent } from "@/lib/hive/types";
import { cn } from "@/lib/utils";

/** The current time, refreshed about ten times a second while `active` so a running timer visibly grows. */
function useNow(active: boolean, everyMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [active, everyMs]);
  return now;
}

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
  const splitters = useHiveStore((s) => s.splitters);
  const agentTotal = useHiveStore((s) => s.agentTotal);
  const phase = useHiveStore((s) => s.phase);
  const fileLocks = useHiveStore((s) => s.fileLocks);
  const pauseReason = useHiveStore((s) => s.pauseReason);
  const freeze = useHiveStore((s) => s.freeze);
  const frozen = useHiveStore((s) => s.frozen);
  const audits = useHiveStore((s) => s.audits);
  const lastRun = useSyncExternalStore(perf.subscribe, perf.getLast, perf.getLast);
  const recent = audits.slice(0, 10);
  const now = useNow(hasOpenAudit(recent));

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
          <ModelBlock />

          <Separator />

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
              Splitters
              <span className="ml-2 normal-case tracking-normal text-dim/80">
                ~{MODEL_CLASS.splitter} · {splitters.length}/{MAX_SPLITTERS}
              </span>
            </p>
            {splitters.length === 0 ? (
              <p className="text-xs text-dim">No Splitters active</p>
            ) : (
              <ul className="space-y-2" aria-label="Splitters">
                {splitters.map((sp) => (
                  <li
                    key={sp.id}
                    className="rounded-md border border-line bg-navy-3 px-3 py-2"
                    data-testid={`splitter-${sp.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-honey">{sp.id}</span>
                      <Badge tone={sp.status === "done" ? "ok" : "mist"}>{sp.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-mist">{sp.activity}</p>
                    <p className="mt-0.5 text-[11px] text-dim">
                      {sp.lieutenants.length === 0
                        ? "No Li yet"
                        : `Role-playing ${sp.lieutenants.map((l) => `Li ${l.letter}`).join(", ")}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
                      <span className="font-mono text-xs text-honey">
                        Li {li.letter}
                        {li.splitterId && <span className="ml-2 text-dim">on {li.splitterId}</span>}
                      </span>
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

          {lastRun && (
            <>
              <Separator />
              <div data-testid="perf-report">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
                  Last run timing
                </p>
                <ul className="space-y-1">
                  {perfRows(lastRun).map(([name, value, indent]) => (
                    <li
                      key={name}
                      className={cn(
                        "flex justify-between gap-3 text-[11px] leading-snug",
                        indent ? "pl-3 text-dim" : "text-mist",
                      )}
                    >
                      <span className="shrink-0">{name}</span>
                      <span className="text-right font-mono">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
              Recent activity
            </p>
            <ul className="space-y-2">
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 text-[11px] leading-snug text-mist"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-honey/80">{a.actor}</span>
                    <span className="text-dim"> · </span>
                    {a.action}
                  </span>
                  <ActivityTime event={a} now={now} />
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

/** How long an activity took; while it is still going, a live timer that keeps growing. */
function ActivityTime({ event, now }: { event: AuditEvent; now: number }) {
  const running = event.endedAt === undefined;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 font-mono tabular-nums",
        running ? "text-honey" : "text-dim",
      )}
      data-testid="activity-time"
      data-running={running}
      title={running ? "Still running" : "How long this took"}
    >
      {running && <span className="size-1.5 animate-pulse rounded-full bg-honey" aria-hidden />}
      {formatDuration(auditDurationMs(event, now))}
    </span>
  );
}

/** The on-device model: not loaded, downloading, ready (and on what), or why it could not start. */
function ModelBlock() {
  const m = useSyncExternalStore(subscribeModelStatus, getModelStatus, getModelStatus);
  const loading = describeModelStatus(m);
  const where = m.device === "webgpu" ? "GPU" : "CPU";
  return (
    <div data-testid="model-status">
      <p className="font-display text-xs font-semibold tracking-[0.18em] text-honey">MODEL</p>
      {loading ? (
        <>
          <p className="mt-1 text-sm text-fog">{loading}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-navy-4">
            <div
              className="h-full rounded-full bg-honey transition-[width] duration-200"
              style={{ width: `${Math.max(4, Math.round(m.progress * 100))}%` }}
            />
          </div>
        </>
      ) : m.stage === "ready" ? (
        <p className="mt-1 text-sm text-fog">
          {m.model} · {where}
          {m.dtype ? ` · ${m.dtype}` : ""} · ready
        </p>
      ) : m.stage === "error" ? (
        <p className="mt-1 text-xs leading-relaxed text-danger">
          Could not start. Hive will retry with a smaller file when you send a request.
        </p>
      ) : (
        <p className="mt-1 text-sm text-dim">Not loaded yet</p>
      )}
    </div>
  );
}
