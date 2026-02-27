import type { YoutubeVideoItem } from "../types/youtube";

type Listener = (videos: YoutubeVideoItem[]) => void;

export interface YoutubeBloggerStats {
  subscribers: string; // 订阅量（原始文本）
  videoCount: string; // 视频数量（原始文本）
}

type BloggerListener = (name: string, stats: YoutubeBloggerStats) => void;

export interface YoutubeVideoMessage {
  type: "YT_VIDEOS_UPDATE";
  videos: YoutubeVideoItem[];
  bloggerName?: string;
}

export interface YoutubeBloggerMessage {
  type: "YT_BLOGGER_UPDATE";
  bloggerName: string;
  stats: YoutubeBloggerStats;
}

export interface YoutubeRefreshMessage {
  type: "YT_REFRESH";
}

type AnyYoutubeMessage =
  | YoutubeVideoMessage
  | YoutubeBloggerMessage
  | YoutubeRefreshMessage;

class YoutubeStore {
  private videos: YoutubeVideoItem[] = [];
  private listeners: Listener[] = [];
  private bloggerListeners: BloggerListener[] = [];
  private currentBlogger = "";
  private currentStats: YoutubeBloggerStats = {
    subscribers: "",
    videoCount: "",
  };

  add(incoming: YoutubeVideoItem[]) {
    const existingIds = new Set(this.videos.map((v) => v.videoId));
    const fresh = incoming.filter((v) => !existingIds.has(v.videoId));
    if (fresh.length === 0) return;
    this.videos = [...this.videos, ...fresh];
    this.emit();
  }

  clear() {
    this.videos = [];
    this.emit();
  }

  get(): YoutubeVideoItem[] {
    return this.videos;
  }

  getBlogger(): string {
    return this.currentBlogger;
  }

  getStats(): YoutubeBloggerStats {
    return this.currentStats;
  }

  setBlogger(name: string, stats?: YoutubeBloggerStats) {
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
    this.listeners.forEach((fn) => fn(this.videos));
    this.saveToStorage();
  }

  private saveToStorage() {
    browser.storage.session
      .set({
        yt_videos: this.videos,
        yt_blogger: this.currentBlogger,
        yt_stats: this.currentStats,
      })
      .catch(() => {});
  }

  sendToSidePanel(bloggerName?: string) {
    const msg: YoutubeVideoMessage = {
      type: "YT_VIDEOS_UPDATE",
      videos: this.videos,
      bloggerName: bloggerName ?? this.currentBlogger,
    };
    browser.runtime.sendMessage(msg).catch(() => {});
  }

  sendBloggerUpdate(name: string, stats: YoutubeBloggerStats) {
    const msg: YoutubeBloggerMessage = {
      type: "YT_BLOGGER_UPDATE",
      bloggerName: name,
      stats,
    };
    browser.runtime.sendMessage(msg).catch(() => {});
  }

  listenFromContentScript() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as AnyYoutubeMessage;
      if (msg?.type === "YT_VIDEOS_UPDATE") {
        if (msg.bloggerName) this.setBlogger(msg.bloggerName);
        this.add(msg.videos);
      } else if (msg?.type === "YT_BLOGGER_UPDATE") {
        this.clear();
        this.setBlogger(msg.bloggerName, msg.stats);
      }
    });
  }

  sendRefreshToContentScript() {
    browser.windows.getCurrent().then((win) => {
      browser.tabs.query({ active: true, windowId: win.id }).then((tabs) => {
        const tab = tabs[0];
        if (tab?.id == null || !tab.url?.includes("youtube.com")) return;
        browser.tabs
          .sendMessage(
            tab.id,
            { type: "YT_REFRESH" } satisfies YoutubeRefreshMessage,
          )
          .catch(() => {});
      });
    });
  }
}

export const youtubeStore = new YoutubeStore();
