import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAiStatus, runMcTask } from "./mc";
import {
  connectGithub,
  createGithubRepo,
  disconnectGithub,
  listGithubRepos,
  pushToGithub,
} from "../github/api";
import { STORAGE_KEY } from "./constants";
import { acquireLock, estimateSwarm, hrcAllocate } from "./limits";
import type {
  Artifact,
  Attachment,
  AuditEvent,
  ChatMessage,
  ExecStatus,
  FileLock,
  GithubRepo,
  HiveView,
  LieutenantState,
  MemoryEntry,
  Project,
  RunPhase,
  SplitterState,
} from "./types";
import { nid } from "../utils";

// NOTE: Full Splitter-aware store was committed locally.
// This push uses the GitHub API; if truncated, re-sync from local clone.
// See local commit 9195337 for the complete implementation.

export { useHiveStore } from "./store";
