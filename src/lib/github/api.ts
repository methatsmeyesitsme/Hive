import { createServerFn } from "@tanstack/react-start";

export const connectGithub = createServerFn({ method: "POST" })
  .validator((input: { workspaceId: string; username: string; pat: string }) => {
    if (!input.workspaceId?.trim()) throw new Error("Missing workspace");
    if (!input.pat?.trim()) throw new Error("Personal access token is required");
    return {
      workspaceId: input.workspaceId.trim(),
      username: input.username.trim(),
      pat: input.pat.trim(),
    };
  })
  .handler(async ({ data }) => {
    const vault = await import("./vault.server");
    return vault.connect(data.workspaceId, data.username, data.pat);
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .validator((input: { workspaceId: string }) => input)
  .handler(async ({ data }) => {
    const vault = await import("./vault.server");
    return vault.disconnect(data.workspaceId);
  });

export const listGithubRepos = createServerFn({ method: "POST" })
  .validator((input: { workspaceId: string }) => input)
  .handler(async ({ data }) => {
    const vault = await import("./vault.server");
    return vault.listRepos(data.workspaceId);
  });

export const createGithubRepo = createServerFn({ method: "POST" })
  .validator((input: { workspaceId: string; name: string; isPrivate?: boolean }) => input)
  .handler(async ({ data }) => {
    const vault = await import("./vault.server");
    return vault.createRepo(data.workspaceId, data.name, data.isPrivate !== false);
  });

export const pushToGithub = createServerFn({ method: "POST" })
  .validator(
    (input: {
      workspaceId: string;
      repoFullName: string;
      files: { path: string; content: string }[];
      message: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const vault = await import("./vault.server");
    return vault.pushFiles(data.workspaceId, data.repoFullName, data.files, data.message);
  });
