import { HocuspocusProvider } from "@hocuspocus/provider";
import { Doc } from "yjs";

export interface AiEditorCollaborationUser {
  id: string;
  name: string;
  color: string;
}

export interface AiEditorCollaborationStatus {
  connected: boolean;
  authenticated: boolean;
  synced: boolean;
}

export interface AiEditorCollaborationOptions {
  url: string;
  documentName: string;
  token?: string | (() => string) | (() => Promise<string>);
  userId?: string;
  userName: string;
  userColor?: string;
  parameters?: Record<string, string>;
  onAuthenticated?: () => void;
  onAuthenticationFailed?: (reason: string) => void;
  onUsersUpdate?: (users: AiEditorCollaborationUser[]) => void;
  onSynced?: (synced: boolean) => void;
  onConnectionStatusChange?: (status: AiEditorCollaborationStatus) => void;
  onStateless?: (payload: string) => void;
  /** Pass a session that has completed its first server sync before creating AiEditor. */
  session?: AiEditorCollaborationSession;
}

type AwarenessState = {
  user?: AiEditorCollaborationUser;
};

type AuthenticationFailedPayload = {
  reason: string;
};

type SyncedPayload = {
  state: boolean;
};

type StatelessPayload = {
  payload: string;
};

const DEFAULT_COLORS = [
  "#7986CB",
  "#81C784",
  "#64B5F6",
  "#FFB74D",
  "#BA68C8",
  "#4DB6AC",
  "#F06292",
  "#9575CD",
  "#FF8A65",
  "#4FC3F7",
];

const randomId = () => Math.random().toString(36).slice(2, 10);

const pickColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  const colorIndex = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[colorIndex];
};

export class AiEditorCollaborationSession {
  document: Doc;

  provider: HocuspocusProvider;

  user: AiEditorCollaborationUser;

  readonly documentName: string;

  private destroyed = false;

  private initialSyncCompleted = false;

  private readonly pendingInitialSync = new Set<(error: Error) => void>();

  private status: AiEditorCollaborationStatus = {
    connected: false,
    authenticated: false,
    synced: false,
  };

  constructor(options: AiEditorCollaborationOptions) {
    this.documentName = options.documentName;
    const userId = options.userId || randomId();
    const userColor = options.userColor || pickColor(userId);

    this.user = {
      id: userId,
      name: options.userName,
      color: userColor,
    };

    this.document = new Doc();
    this.document.getXmlFragment("content");

    this.provider = new HocuspocusProvider({
      url: options.url,
      name: options.documentName,
      document: this.document,
      token: options.token,
      // All synchronization, including same-origin tabs, goes through server authorization.
      broadcast: false,
      // Each session owns its websocket, so disconnect must close it.
      preserveConnection: false,
      parameters: options.parameters,
      onOpen: () => {
        this.applyLocalUser();
      },
      onConnect: () => {
        this.applyLocalUser();
        this.updateStatus(options, {
          connected: true,
        });
      },
      onAuthenticated: () => {
        options.onAuthenticated?.();
        this.updateStatus(options, {
          authenticated: true,
        });
      },
      onAuthenticationFailed: ({ reason }: AuthenticationFailedPayload) => {
        options.onAuthenticationFailed?.(reason);
        this.updateStatus(options, {
          authenticated: false,
          synced: false,
        });
      },
      onSynced: ({ state }: SyncedPayload) => {
        options.onSynced?.(state);
        this.updateStatus(options, {
          synced: state,
        });
      },
      onStateless: ({ payload }: StatelessPayload) => {
        options.onStateless?.(payload);
      },
      onDisconnect: () => {
        this.updateStatus(options, {
          connected: false,
          authenticated: false,
          synced: false,
        });
      },
      onClose: () => {
        this.updateStatus(options, {
          connected: false,
          authenticated: false,
          synced: false,
        });
      },
    });

    this.applyLocalUser();
    this.provider.awareness?.on("change", () => {
      options.onUsersUpdate?.(this.getUsers());
    });
  }

  getUsers(): AiEditorCollaborationUser[] {
    const states = Array.from(
      this.provider.awareness?.getStates().values() || [],
    ) as AwarenessState[];

    return states
      .filter((state) => state.user)
      .map((state) => state.user as AiEditorCollaborationUser);
  }

  getStatus(): AiEditorCollaborationStatus {
    return { ...this.status };
  }

  hasInitialSync(): boolean {
    return this.initialSyncCompleted && !this.destroyed;
  }

  /** Wait before binding the editor, so its empty initial paragraph cannot join the shared document. */
  waitForInitialSync(timeoutMs = 12_000, signal?: AbortSignal): Promise<void> {
    if (this.destroyed) return Promise.reject(new Error("Collaboration session destroyed"));
    if (this.provider.synced && this.status.authenticated) {
      this.initialSyncCompleted = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pendingInitialSync.delete(cancel);
        this.provider.off("synced", onSynced);
        this.provider.off("authenticationFailed", onAuthenticationFailed);
        signal?.removeEventListener("abort", onAbort);
        if (error) reject(error);
        else {
          this.initialSyncCompleted = true;
          resolve();
        }
      };
      const onSynced = ({ state }: SyncedPayload) => {
        if (state && this.status.authenticated) finish();
      };
      const onAuthenticationFailed = ({ reason }: AuthenticationFailedPayload) =>
        finish(new Error(`Collaboration authentication failed: ${reason}`));
      const onAbort = () => finish(new Error("Collaboration initialization cancelled"));
      const cancel = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new Error("Collaboration initial sync timed out")), timeoutMs);
      this.pendingInitialSync.add(cancel);
      this.provider.on("synced", onSynced);
      this.provider.on("authenticationFailed", onAuthenticationFailed);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
      else if (this.provider.synced && this.status.authenticated) finish();
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const cancel of [...this.pendingInitialSync]) {
      cancel(new Error("Collaboration session destroyed"));
    }
    this.provider.destroy();
    // This session created its own websocket provider; HocuspocusProvider.destroy()
    // detaches it but does not dispose the underlying socket provider.
    this.provider.configuration.websocketProvider.destroy();
    this.document.destroy();
  }

  private applyLocalUser() {
    this.provider.awareness?.setLocalStateField("user", this.user);
  }

  private updateStatus(
    options: AiEditorCollaborationOptions,
    patch: Partial<AiEditorCollaborationStatus>,
  ) {
    this.status = {
      ...this.status,
      ...patch,
    };

    options.onConnectionStatusChange?.({
      ...this.status,
    });
  }
}
