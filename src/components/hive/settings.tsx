import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useHiveStore } from "@/lib/hive/store";
import { APP_VERSION } from "@/lib/hive/version";
import { toast } from "sonner";

export function SettingsView() {
  const sessionName = useHiveStore((s) => s.sessionName);
  const logout = useHiveStore((s) => s.logout);
  const githubConnected = useHiveStore((s) => s.githubConnected);
  const githubUsername = useHiveStore((s) => s.githubUsername);
  const githubRepo = useHiveStore((s) => s.githubRepo);
  const githubRepos = useHiveStore((s) => s.githubRepos);
  const githubBusy = useHiveStore((s) => s.githubBusy);
  const githubError = useHiveStore((s) => s.githubError);
  const connect = useHiveStore((s) => s.connectGithub);
  const disconnect = useHiveStore((s) => s.disconnectGithub);
  const setGithubRepo = useHiveStore((s) => s.setGithubRepo);
  const refreshRepos = useHiveStore((s) => s.refreshRepos);
  const createRepo = useHiveStore((s) => s.createRepo);

  const [username, setUsername] = useState(githubUsername);
  const [pat, setPat] = useState("");
  const [newRepo, setNewRepo] = useState("");

  const saveGithub = async () => {
    const ok = await connect(username, pat);
    setPat("");
    if (ok) toast.success("GitHub connected");
  };

  return (
    <div className="flex h-full flex-col bg-navy">
      <header className="flex h-14 items-center border-b border-line px-5">
        <h1 className="font-display text-sm font-semibold tracking-tight">Settings</h1>
        <span className="ml-auto font-mono text-xs text-dim" data-testid="app-version">
          v{APP_VERSION}
        </span>
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 space-y-8 overflow-auto px-5 py-8">
        <section>
          <h2 className="font-display text-base font-semibold">Account</h2>
          <p className="mt-1 text-sm text-mist">This workspace is local to this browser.</p>
          <div className="mt-4 rounded-lg border border-line bg-navy-2 p-4">
            <p className="text-xs text-dim">Signed in as</p>
            <p className="mt-1 text-sm text-fog">{sessionName}</p>
            <Button variant="secondary" className="mt-4" onClick={logout}>
              Log out
            </Button>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="font-display text-base font-semibold">GitHub</h2>
          <p className="mt-1 text-sm text-mist">
            RO is the only Hive worker that can use this token. It is stored on the server, never shown again, and never placed in prompts, chat, or memory.
          </p>

          {githubConnected ? (
            <div className="mt-4 space-y-4 rounded-lg border border-line bg-navy-2 p-4">
              <p className="text-sm text-fog">
                Connected as <span className="font-medium text-honey">{githubUsername}</span>
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="repo">Active repository</Label>
                <select
                  id="repo"
                  value={githubRepo ?? ""}
                  onChange={(e) => setGithubRepo(e.target.value || null)}
                  onFocus={() => void refreshRepos()}
                  className="flex h-10 w-full rounded-md border border-line bg-navy-3 px-3 text-sm text-fog"
                >
                  <option value="">Choose a repository</option>
                  {githubRepos.map((r) => (
                    <option key={r.fullName} value={r.fullName}>
                      {r.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="new-repo-name"
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={!newRepo.trim() || githubBusy}
                  onClick={async () => {
                    const full = await createRepo(newRepo.trim());
                    if (full) {
                      toast.success(`Created ${full}`);
                      setNewRepo("");
                    }
                  }}
                >
                  Create
                </Button>
              </div>
              <Button variant="ghost" onClick={() => void disconnect()}>
                Disconnect GitHub
              </Button>
            </div>
          ) : (
            <form
              className="mt-4 space-y-3 rounded-lg border border-line bg-navy-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void saveGithub();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="gh-user">GitHub username</Label>
                <Input
                  id="gh-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gh-pat">Personal access token</Label>
                <Input
                  id="gh-pat"
                  type="password"
                  autoComplete="off"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="ghp_… or github_pat_…"
                />
              </div>
              {githubError && <p className="text-xs text-danger">{githubError}</p>}
              <Button type="submit" disabled={githubBusy || !pat.trim()}>
                {githubBusy ? "Validating…" : "Connect"}
              </Button>
            </form>
          )}
        </section>

        <Separator />

        <section>
          <h2 className="font-display text-base font-semibold">About</h2>
          <div className="mt-4 rounded-lg border border-line bg-navy-2 p-4">
            <p className="text-xs text-dim">Version</p>
            <p className="mt-1 font-mono text-sm text-fog">Hive v{APP_VERSION}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
