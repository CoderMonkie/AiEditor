import { HocuspocusProvider } from "@hocuspocus/provider";
import { Doc } from "yjs";
import { resolveCollaborationUrl } from "./CollaborationUrl.ts";
import { resolveCollaborationDocumentId } from "./CollaborationDocument.ts";
import { requestCollaborationPersistence } from "./CollaborationPersistence.ts";

export interface AiEditorCollaborationUser {
  id: string;
  name: string;
  color: string;
}

export interface AiEditorCollaborationStatus {
  connected: boolean;
  authenticated: boolean;
  synced: boolean;
  admitted: boolean;
  writable: boolean;
  rejectionReason?: string;
}

export interface AiEditorCollaborationOptions {
  url?: string;
  /** Unique document ID (KAM DocIndexID); never use the title as this value. */
  documentId: string;
  /** Optional display title; never used for room selection or storage lookup. */
  documentName?: string;
  token?: string | (() => string) | (() => Promise<string>);
  userId?: string;
  userName: string;
  userColor?: string;
  parameters?: Record<string, string>;
  /** KAM writers wait for the service to grant a seat and assign their color. */
  requireEditorAdmission?: boolean;
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

const offlineStatus = { connected: false, authenticated: false, synced: false, admitted: false };

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

// KAM_COLLAB_SESSION — component adapter: advanced-editor/hocks/useCollaboration.js.
// KAM_COLLAB_ADMISSION — server seat, current connection color, and first sync gate.
export class AiEditorCollaborationSession {
  document: Doc;

  provider: HocuspocusProvider;

  user: AiEditorCollaborationUser;

  readonly documentId: string;

  readonly documentName?: string;
  readonly requiresEditorAdmission: boolean;

  private readonly options: AiEditorCollaborationOptions;
  private destroyed = false;
  private readonly lifetime = new AbortController();

  private initialSyncCompleted = false;

  private readonly pendingInitialSync = new Set<(error: Error) => void>();
  private readonly statusListeners = new Set<(status: AiEditorCollaborationStatus) => void>();

  private status: AiEditorCollaborationStatus = {
    ...offlineStatus,
    writable: false,
  };

  constructor(options: AiEditorCollaborationOptions) {
    this.options = options;
    this.documentId = resolveCollaborationDocumentId(options);
    this.documentName = options.documentName;
    this.requiresEditorAdmission = options.requireEditorAdmission === true;
    const url = resolveCollaborationUrl(options.url);
    const requestedUserId = options.userId?.trim();
    if (this.requiresEditorAdmission) {
      if (!requestedUserId || requestedUserId.length > 128 || /[\x00-\x1f\x7f]/.test(requestedUserId)) {
        throw new Error("KAM editor admission requires a stable userId");
      }
      if (new URL(url).search) {
        throw new Error("KAM editor admission requires a WebSocket URL without a query; use parameters");
      }
    }
    const userId = (this.requiresEditorAdmission ? requestedUserId : options.userId) || randomId();

    this.user = {
      id: userId,
      name: options.userName,
      color: this.requiresEditorAdmission ? "" : (options.userColor || pickColor(userId)),
    };

    // KAM_COLLAB_TRANSPORT — bundle entry: createCollaborationTransport.
    // Keep transplanted additions readable; bundled Yjs/Provider names are mapped there.
    this.document = new Doc();
    this.document.getXmlFragment("content");

    this.provider = new HocuspocusProvider({
      url,
      // Hocuspocus calls its room key "name". It must carry the unique ID, not the title.
      name: this.documentId,
      document: this.document,
      token: options.token,
      // All synchronization, including same-origin tabs, goes through server authorization.
      broadcast: false,
      // Each session owns its websocket, so disconnect must close it.
      preserveConnection: false,
      parameters: this.requiresEditorAdmission ? { ...options.parameters, kam: "1", userId } : options.parameters,
      onOpen: () => {
        if (this.requiresEditorAdmission) {
          this.resetConnection(undefined);
          this.provider.synced = false;
        } else this.applyLocalUser();
      },
      onConnect: () => {
        if (!this.requiresEditorAdmission) this.applyLocalUser();
        this.updateStatus({ connected: true });
      },
      onAuthenticated: () => {
        this.updateStatus({ authenticated: true, rejectionReason: undefined });
        options.onAuthenticated?.();
      },
      onAuthenticationFailed: ({ reason }: AuthenticationFailedPayload) => {
        this.resetConnection(reason);
        options.onAuthenticationFailed?.(reason);
      },
      onSynced: ({ state }: SyncedPayload) => {
        this.updateStatus({ synced: state });
        options.onSynced?.(state);
      },
      onStateless: ({ payload }: StatelessPayload) => {
        if (this.requiresEditorAdmission) this.acceptAdmission(payload);
        options.onStateless?.(payload);
      },
      onDisconnect: () => this.resetConnection(this.status.rejectionReason),
      onClose: () => this.resetConnection(this.status.rejectionReason),
    });

    if (this.requiresEditorAdmission) this.provider.awareness?.setLocalState(null);
    else this.applyLocalUser();
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

  subscribeStatus(listener: (status: AiEditorCollaborationStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  canWrite(): boolean {
    return !this.destroyed && this.status.writable;
  }

  disconnect() {
    if (this.destroyed) return;
    this.resetConnection(undefined);
    this.provider.disconnect();
  }

  /** Retry on the same Y.Doc, including after an admission refusal. */
  async reconnect(): Promise<void> {
    if (this.destroyed) throw new Error("Collaboration session destroyed");
    if (this.status.connected) return;
    this.resetConnection(undefined);
    await this.provider.connect();
  }

  flush(): Promise<any> {
    if (this.destroyed || !this.isReady() || (this.requiresEditorAdmission && !this.canWrite())) {
      return Promise.reject(new Error("Collaboration is not ready to confirm persistence"));
    }
    return requestCollaborationPersistence(this.provider, this.documentId, this.lifetime.signal);
  }

  hasInitialSync(): boolean {
    return this.initialSyncCompleted && !this.destroyed && (!this.requiresEditorAdmission || this.canWrite());
  }

  /** Wait before binding the editor, so its empty initial paragraph cannot join the shared document. */
  waitForInitialSync(timeoutMs = 12_000, signal?: AbortSignal): Promise<void> {
    if (this.destroyed) return Promise.reject(new Error("Collaboration session destroyed"));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pendingInitialSync.delete(cancel);
        unsubscribe();
        signal?.removeEventListener("abort", onAbort);
        if (error) reject(error);
        else {
          this.initialSyncCompleted = true;
          resolve();
        }
      };
      const check = () => {
        if (this.status.rejectionReason) finish(new Error(`Collaboration authentication failed: ${this.status.rejectionReason}`));
        else if (this.requiresEditorAdmission ? this.canWrite() : this.isReady()) finish();
      };
      const onAbort = () => finish(new Error("Collaboration initialization cancelled"));
      const cancel = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new Error("Collaboration initial sync timed out")), timeoutMs);
      this.pendingInitialSync.add(cancel);
      const unsubscribe = this.subscribeStatus(check);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
      else check();
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.lifetime.abort();
    for (const cancel of [...this.pendingInitialSync]) {
      cancel(new Error("Collaboration session destroyed"));
    }
    this.statusListeners.clear();
    this.provider.destroy();
    // This session created its own websocket provider; HocuspocusProvider.destroy()
    // detaches it but does not dispose the underlying socket provider.
    this.provider.configuration.websocketProvider.destroy();
    this.document.destroy();
  }

  private applyLocalUser() {
    const awareness = this.provider.awareness;
    if (awareness) awareness.setLocalState({ ...awareness.getLocalState(), user: { ...this.user } });
  }

  private resetConnection(rejectionReason: string | undefined) {
    if (this.requiresEditorAdmission) this.user.color = "";
    this.updateStatus({ ...offlineStatus, rejectionReason });
  }

  private acceptAdmission(payload: string) {
    if (!this.status.authenticated || this.status.admitted) return;
    let message;
    try { message = JSON.parse(payload); } catch { return; }
    if (message?.type !== "kam:editor-admitted" || message.documentId !== this.documentId ||
        message.userId !== this.user.id || typeof message.color !== "string" || !/^#[0-9a-f]{6}$/i.test(message.color)) return;
    this.user.color = message.color;
    this.updateStatus({ admitted: true });
  }

  private isReady(status = this.status) {
    return status.connected && status.authenticated && status.synced;
  }

  private updateStatus(patch: Partial<AiEditorCollaborationStatus>) {
    if (this.destroyed) return;
    const previous = this.status;
    const next = { ...previous, ...patch };
    next.writable = this.isReady(next) && this.provider.authorizedScope === "read-write" &&
      (!this.requiresEditorAdmission || next.admitted);
    this.status = next;
    if (this.requiresEditorAdmission) {
      if (next.writable && !previous.writable) this.applyLocalUser();
      // With no local state the cursor plugin cannot publish a cursor without an assigned user.
      else if (!next.writable && this.provider.awareness?.getLocalState() != null) {
        this.provider.awareness.setLocalState(null);
      }
    }
    if (Object.keys(next).some(key => next[key as keyof AiEditorCollaborationStatus] !== previous[key as keyof AiEditorCollaborationStatus])) {
      this.options.onConnectionStatusChange?.(this.getStatus());
      for (const listener of this.statusListeners) listener(this.getStatus());
    }
  }
}
