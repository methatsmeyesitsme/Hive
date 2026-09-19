import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiveMark } from "./logo";
import { useHiveStore } from "@/lib/hive/store";

export function Welcome() {
  const enter = useHiveStore((s) => s.enterWorkspace);
  const [name, setName] = useState("");

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy px-5 hex-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--color-honey) 8%, transparent), transparent 55%)",
        }}
      />
      <form
        className="relative w-full max-w-sm rise-in"
        onSubmit={(e) => {
          e.preventDefault();
          enter(name);
        }}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 text-honey">
            <HiveMark className="size-12" />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-[0.22em] text-fog">
            HIVE
          </h1>
          <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-mist">
            Tell MC what you want built. The swarm handles the rest.
          </p>
        </div>
        <label className="sr-only" htmlFor="hive-name">
          Your name
        </label>
        <Input
          id="hive-name"
          autoFocus
          autoComplete="nickname"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 border-line-strong bg-navy-3"
        />
        <Button type="submit" className="mt-3 h-11 w-full" disabled={!name.trim()}>
          Enter workspace
        </Button>
      </form>
    </div>
  );
}
