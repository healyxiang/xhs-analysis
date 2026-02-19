import { noteStore } from "../utils/noteStore";
import type { RefreshMessage, BloggerStats } from "../utils/noteStore";
import { parseNoteFromDom } from "../types/note";

// ── 博主信息读取 ─────────────────────────────────────────────
function getBloggerName(): string {
  // 小红书博主主页：名字在 .user-name 或 h1 等元素
  const el =
    document.querySelector(".user-name") ??
    document.querySelector(".username") ??
    document.querySelector('[class*="user-name"]') ??
    document.querySelector('[class*="nickname"]');
  return el?.textContent?.trim() ?? "";
}

function getBloggerStats(): BloggerStats {
  // 小红书博主主页数据条：关注 / 粉丝 / 获赞与收藏
  // 结构：.user-interactions 或 .info-panel 下的 .count span
  const counts = document.querySelectorAll(
    '.user-interactions .count, .interactions .count, [class*="user-interaction"] .count',
  );
  const vals = Array.from(counts).map((el) => el.textContent?.trim() ?? "");
  return {
    following: vals[0] ?? "", // 关注数（页面第一个）
    followers: vals[1] ?? "", // 粉丝数（页面第二个）
    likes: vals[2] ?? "", // 获赞与收藏
  };
}

// ── DOM 扫描：提取当前页面所有笔记卡片 ────────────────────────
function scanNotes() {
  const cards = document.querySelectorAll("section.note-item");
  if (cards.length === 0) return;

  const parsed = Array.from(cards)
    .map(parseNoteFromDom)
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (parsed.length > 0) {
    noteStore.add(parsed);
    noteStore.sendToSidePanel();
  }
}

let feedObserver: MutationObserver | null = null;

// ── MutationObserver：监听笔记卡片动态插入（无限滚动）─────────
function startObserver() {
  feedObserver?.disconnect();

  const container =
    document.querySelector("#userPostedFeeds") ??
    document.querySelector(".feeds-container") ??
    document.body;

  feedObserver = new MutationObserver(() => {
    scanNotes();
  });

  feedObserver.observe(container, { childList: true, subtree: true });
}

function tryInitialScan() {
  const blogger = getBloggerName();
  const stats = getBloggerStats();
  if (blogger) {
    // 先在本地设置博主信息，这样后续 sendToSidePanel 会带上正确的博主名
    noteStore.setBlogger(blogger, stats);
    noteStore.sendBloggerUpdate(blogger, stats);
  } else {
    // 博主名还未渲染，等一下
    setTimeout(() => {
      const name = getBloggerName();
      if (name) {
        const s = getBloggerStats();
        noteStore.setBlogger(name, s);
        noteStore.sendBloggerUpdate(name, s);
      }
    }, 1500);
  }

  if (document.querySelector("section.note-item")) {
    scanNotes();
    startObserver();
  } else {
    const waitObserver = new MutationObserver(() => {
      if (document.querySelector("section.note-item")) {
        waitObserver.disconnect();
        scanNotes();
        startObserver();
      }
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
  }
}

export default defineContentScript({
  matches: ["*://*.xiaohongshu.com/*"],

  main() {
    // ── 监听刷新指令（来自 side panel）───────────────────────
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as RefreshMessage;
      if (msg?.type === "XHS_REFRESH") {
        // 1. 清空旧数据
        noteStore.clear();

        // 2. 立即读取当前页面的博主信息，更新本地
        const blogger = getBloggerName();
        const stats = getBloggerStats();
        if (blogger) {
          noteStore.setBlogger(blogger, stats);
        }

        // 3. 发送清空 + 新博主信息给 side panel
        noteStore.sendBloggerUpdate(blogger || noteStore.getBlogger(), stats);

        // 4. 重新扫描笔记
        if (document.querySelector("section.note-item")) {
          scanNotes();
          startObserver();
        }
      }
    });

    // ── 首次扫描 ─────────────────────────────────────────────
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryInitialScan);
    } else {
      tryInitialScan();
    }
  },
});
