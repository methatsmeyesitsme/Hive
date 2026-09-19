import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useHiveStore } from "@/lib/hive/store";
import { relativeTime } from "@/lib/utils";

export function MemoryView() {
  const memories = useHiveStore((s) => s.memories);
  const updateMemory = useHiveStore((s) => s.updateMemory);
  const deleteMemory = useHiveStore((s) => s.deleteMemory);
  const addMemory = useHiveStore((s) => s.addMemory);

  return (
    <div className="flex h-full flex-col bg-navy">
      <header className="flex h-14 items-center justify-between border-b border-line px-5">
        <div>
          <h1 className="font-display text-sm font-semibold tracking-tight">Hive memory</h1>
          <p className="text-[11px] text-dim">Editable knowledge RO keeps for later runs</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            addMemory({
              title: "New note",
              content: "",
              source: "project",
            })
          }
        >
          Add
        </Button>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto px-5 py-6">
        {memories.length === 0 && (
          <p className="text-sm text-mist">
            Empty. RO stores useful research and completed-work notes here after a run. Nothing secret belongs in memory.
          </p>
        )}
        {memories.map((m) => (
          <article key={m.id} className="rounded-lg border border-line bg-navy-2 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                {m.source} · {relativeTime(m.createdAt)}
              </p>
              <button
                type="button"
                className="rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-danger"
                onClick={() => deleteMemory(m.id)}
                aria-label="Delete memory"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <Input
              value={m.title}
              onChange={(e) => updateMemory(m.id, { title: e.target.value })}
              className="border-transparent bg-transparent px-0 font-medium"
            />
            <Textarea
              value={m.content}
              onChange={(e) => updateMemory(m.id, { content: e.target.value })}
              className="mt-2 min-h-20 border-transparent bg-transparent px-0"
            />
          </article>
        ))}
      </div>
    </div>
  );
}
