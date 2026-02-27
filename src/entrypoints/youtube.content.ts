import {
  parseYoutubeVideoFromDom,
  parseYoutubeVideosFromInitialData,
} from "../types/youtube";
import { youtubeStore } from "../utils/youtubeStore";
import type {
  YoutubeBloggerStats,
  YoutubeRefreshMessage,
} from "../utils/youtubeStore";

function extractJsonObjectFromText(
  source: string,
  marker: string,
): unknown | null {
  const markerIdx = source.indexOf(marker);
  if (markerIdx < 0) return null;

  const braceStart = source.indexOf("{", markerIdx + marker.length);
  if (braceStart < 0) return null;

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const jsonText = source.slice(braceStart, i + 1);
        try {
          return JSON.parse(jsonText);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function extractInitialDataFromHtml(): unknown | null {
  // 1) 优先读运行时对象（最稳定）
  const fromWindow = (window as unknown as { ytInitialData?: unknown })
    .ytInitialData;
  if (fromWindow && typeof fromWindow === "object") return fromWindow;

  // 2) 回退读内联 script 文本（对齐“从 HTML 中间数据解析”的方案）
  const markers = [
    "var ytInitialData =",
    "window.ytInitialData =",
    "window['ytInitialData'] =",
    "a.ytInitialData=",
  ];
  const scripts = Array.from(document.scripts);
  for (const script of scripts) {
    const text = script.textContent ?? "";
    if (!text || !text.includes("ytInitialData")) continue;
    for (const marker of markers) {
      const parsed = extractJsonObjectFromText(text, marker);
      if (parsed) return parsed;
    }
  }

  return null;
}

function isChannelVideosPage() {
  const path = window.location.pathname;
  return (
    path.endsWith("/videos") ||
    path.includes("/videos") ||
    path === "/channel" ||
    path.startsWith("/@")
  );
}

function getYoutubeBloggerName(): string {
  const el =
    // 新版：yt-page-header-view-model 中的 h1 > span
    document.querySelector<HTMLElement>(
      "yt-page-header-view-model h1 span.yt-core-attributed-string",
    ) ??
    document.querySelector<HTMLElement>(
      "#dynamicTextViewModelUrl span.yt-core-attributed-string",
    ) ??
    // 旧版兼容
    document.querySelector<HTMLElement>(
      "#channel-header-container h1 yt-formatted-string",
    ) ??
    document.querySelector<HTMLElement>("ytd-channel-name #text") ??
    document.querySelector<HTMLElement>("#channel-name #text");
  return el?.textContent?.trim() ?? "";
}

function getYoutubeBloggerStats(): YoutubeBloggerStats {
  // 新版：yt-content-metadata-view-model 内的 span
  const metadataTexts = Array.from(
    document.querySelectorAll<HTMLElement>(
      "yt-content-metadata-view-model span.yt-core-attributed-string",
    ),
  )
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean);

  // 旧版兼容
  const legacyTexts = Array.from(
    document.querySelectorAll<HTMLElement>(
      "#channel-header-container #text, #subscriber-count, #metadata .yt-core-attributed-string",
    ),
  )
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean);

  const texts = metadataTexts.length > 0 ? metadataTexts : legacyTexts;

  const subscribers =
    texts.find((item) => /订阅者|subscribers?/i.test(item)) ?? "";
  const videoCount = texts.find((item) => /视频|videos?/i.test(item)) ?? "";
  return { subscribers, videoCount };
}

function scanVideos() {
  if (!isChannelVideosPage()) return;

  const allById = new Map<
    string,
    ReturnType<typeof parseYoutubeVideoFromDom>
  >();

  const initialData = extractInitialDataFromHtml();
  if (initialData) {
    const parsedFromInitial = parseYoutubeVideosFromInitialData(initialData);
    for (const item of parsedFromInitial) {
      allById.set(item.videoId, item);
    }
  }

  const cards = document.querySelectorAll(
    "ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-rich-grid-media",
  );
  const parsedFromDom = Array.from(cards)
    .map(parseYoutubeVideoFromDom)
    .filter((item): item is NonNullable<typeof item> => item !== null);
  for (const item of parsedFromDom) {
    allById.set(item.videoId, item);
  }

  const parsed = Array.from(allById.values()).filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
  if (parsed.length > 0) {
    youtubeStore.add(parsed);
    youtubeStore.sendToSidePanel();
  }
}

let feedObserver: MutationObserver | null = null;

function startObserver() {
  feedObserver?.disconnect();

  const container =
    document.querySelector("ytd-rich-grid-renderer #contents") ??
    document.querySelector("ytd-rich-grid-renderer") ??
    document.querySelector("ytd-two-column-browse-results-renderer") ??
    document.body;

  feedObserver = new MutationObserver(() => {
    scanVideos();
  });

  feedObserver.observe(container, { childList: true, subtree: true });
}

function tryInitialScan() {
  if (!isChannelVideosPage()) return;

  const blogger = getYoutubeBloggerName();
  const stats = getYoutubeBloggerStats();
  if (blogger) {
    youtubeStore.setBlogger(blogger, stats);
    youtubeStore.sendBloggerUpdate(blogger, stats);
  } else {
    setTimeout(() => {
      const name = getYoutubeBloggerName();
      if (name) {
        const s = getYoutubeBloggerStats();
        youtubeStore.setBlogger(name, s);
        youtubeStore.sendBloggerUpdate(name, s);
      }
    }, 1500);
  }

  // 无条件先扫一次：JSON 解析不依赖 DOM 卡片选择器
  scanVideos();
  // 无条件启动观察器：后续页面懒加载/切 tab 时持续补采
  startObserver();
}

export default defineContentScript({
  matches: ["*://*.youtube.com/*"],

  main() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as YoutubeRefreshMessage;
      if (msg?.type === "YT_REFRESH") {
        youtubeStore.clear();

        const blogger = getYoutubeBloggerName();
        const stats = getYoutubeBloggerStats();
        if (blogger) youtubeStore.setBlogger(blogger, stats);

        youtubeStore.sendBloggerUpdate(
          blogger || youtubeStore.getBlogger(),
          stats,
        );

        // 刷新时也走无条件扫描，避免因选择器变更导致空采
        scanVideos();
        startObserver();
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryInitialScan);
    } else {
      tryInitialScan();
    }
  },
});
