import type { NoteItem } from "../types/note";

type Listener = (notes: NoteItem[]) => void;

export interface BloggerStats {
  following: string; // 关注数
  followers: string; // 粉丝数
  likes: string; // 获赞与收藏
}

type BloggerListener = (name: string, stats: BloggerStats) => void;

// 消息类型定义
export interface NoteMessage {
  type: "XHS_NOTES_UPDATE";
  notes: NoteItem[];
  bloggerName?: string;
}

export interface BloggerMessage {
  type: "XHS_BLOGGER_UPDATE";
  bloggerName: string;
  stats: BloggerStats;
}

export interface RefreshMessage {
  type: "XHS_REFRESH";
}

export type AnyMessage = NoteMessage | BloggerMessage | RefreshMessage;

// 简单的发布/订阅 + 跨上下文消息通信
class NoteStore {
  private notes: NoteItem[] = [];
  private listeners: Listener[] = [];
  private bloggerListeners: BloggerListener[] = [];
  private currentBlogger = "";
  private currentStats: BloggerStats = {
    following: "",
    followers: "",
    likes: "",
  };

  add(incoming: NoteItem[]) {
    const existingIds = new Set(this.notes.map((n) => n.noteId));
    const fresh = incoming.filter((n) => !existingIds.has(n.noteId));
    if (fresh.length === 0) return;
    this.notes = [...this.notes, ...fresh];
    this.emit();
  }

  clear() {
    this.notes = [];
    this.emit();
  }

  get(): NoteItem[] {
    return this.notes;
  }

  getBlogger(): string {
    return this.currentBlogger;
  }

  getStats(): BloggerStats {
    return this.currentStats;
  }

  setBlogger(name: string, stats?: BloggerStats) {
    this.currentBlogger = name;
    if (stats) this.currentStats = stats;
    this.bloggerListeners.forEach((fn) => fn(name, this.currentStats));
    this.saveToStorage();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  subscribeBlogger(fn: BloggerListener): () => void {
    this.bloggerListeners.push(fn);
    return () => {
      this.bloggerListeners = this.bloggerListeners.filter((l) => l !== fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.notes));
    this.saveToStorage();
  }

  private saveToStorage() {
    browser.storage.session
      .set({
        xhs_notes: this.notes,
        xhs_blogger: this.currentBlogger,
        xhs_stats: this.currentStats,
      })
      .catch(() => {});
  }

  // ── 跨上下文通信 ──────────────────────────────────────────

  /** Content Script：将笔记数据 + 博主名发给 side panel */
  sendToSidePanel(bloggerName?: string) {
    const msg: NoteMessage = {
      type: "XHS_NOTES_UPDATE",
      notes: this.notes,
      bloggerName: bloggerName ?? this.currentBlogger,
    };
    browser.runtime.sendMessage(msg).catch(() => {});
  }

  /** Content Script：单独发送博主信息更新 */
  sendBloggerUpdate(name: string, stats: BloggerStats) {
    const msg: BloggerMessage = {
      type: "XHS_BLOGGER_UPDATE",
      bloggerName: name,
      stats,
    };
    browser.runtime.sendMessage(msg).catch(() => {});
  }

  /** Side Panel：监听来自 content script 的消息 */
  listenFromContentScript() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as AnyMessage;
      if (msg?.type === "XHS_NOTES_UPDATE") {
        if (msg.bloggerName) this.setBlogger(msg.bloggerName);
        this.add(msg.notes);
      } else if (msg?.type === "XHS_BLOGGER_UPDATE") {
        // 博主刷新：清空旧数据，更新博主名和数据
        this.clear();
        this.setBlogger(msg.bloggerName, msg.stats);
      }
    });
  }

  /** Side Panel：发送刷新指令给 content script（通过 tabs API） */
  sendRefreshToContentScript() {
    // windows.getCurrent() 拿到 Side Panel 所在的窗口 ID
    // 再用 windowId 查活跃 tab，精准定位，不影响其他窗口/tab
    browser.windows.getCurrent().then((win) => {
      browser.tabs.query({ active: true, windowId: win.id }).then((tabs) => {
        const tab = tabs[0];
        // 只在小红书页面发消息，其他网站直接忽略
        if (tab?.id == null || !tab.url?.includes("xiaohongshu.com")) return;
        browser.tabs
          .sendMessage(tab.id, { type: "XHS_REFRESH" } satisfies RefreshMessage)
          .catch(() => {});
      });
    });
  }
}

export const noteStore = new NoteStore();
