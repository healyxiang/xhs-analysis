export interface YoutubeVideoItem {
  videoId: string;
  title: string;
  viewCount: number;
  publishTime: number; // 毫秒时间戳（由“x天前”反推，天级精度）
  publishRelativeText: string;
  href: string;
}

type UnknownRecord = Record<string, unknown>;

function stripSpaces(input: string): string {
  return input.replace(/\s+/g, "").trim();
}

export function parseYoutubeCount(text: string): number {
  if (!text) return 0;

  const raw = stripSpaces(text)
    .replace(/次观看|views?/gi, "")
    .replace(/位订阅者|订阅者|subscribers?/gi, "")
    .replace(/,/g, "");

  const match = raw.match(/^(\d+(?:\.\d+)?)([KMB万亿]?)$/i);
  if (!match) {
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : n;
  }

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (Number.isNaN(value)) return 0;

  if (unit === "k") return Math.round(value * 1_000);
  if (unit === "m") return Math.round(value * 1_000_000);
  if (unit === "b") return Math.round(value * 1_000_000_000);
  if (unit === "万") return Math.round(value * 10_000);
  if (unit === "亿") return Math.round(value * 100_000_000);
  return Math.round(value);
}

export function parseYoutubeRelativeTimeToTimestamp(
  text: string,
  nowMs = Date.now(),
): number {
  if (!text) return 0;

  const raw = stripSpaces(text).toLowerCase();
  const now = new Date(nowMs);
  const date = new Date(nowMs);

  const cn = raw.match(/^(\d+)(分钟|小时|天|周|个月|年)前$/);
  if (cn) {
    const n = Number.parseInt(cn[1], 10);
    const unit = cn[2];
    if (unit === "分钟") date.setMinutes(now.getMinutes() - n);
    if (unit === "小时") date.setHours(now.getHours() - n);
    if (unit === "天") date.setDate(now.getDate() - n);
    if (unit === "周") date.setDate(now.getDate() - n * 7);
    if (unit === "个月") date.setMonth(now.getMonth() - n);
    if (unit === "年") date.setFullYear(now.getFullYear() - n);
    return date.getTime();
  }

  const en = raw.match(
    /^(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)ago$/,
  );
  if (en) {
    const n = Number.parseInt(en[1], 10);
    const unit = en[2];
    if (unit.startsWith("minute")) date.setMinutes(now.getMinutes() - n);
    if (unit.startsWith("hour")) date.setHours(now.getHours() - n);
    if (unit.startsWith("day")) date.setDate(now.getDate() - n);
    if (unit.startsWith("week")) date.setDate(now.getDate() - n * 7);
    if (unit.startsWith("month")) date.setMonth(now.getMonth() - n);
    if (unit.startsWith("year")) date.setFullYear(now.getFullYear() - n);
    return date.getTime();
  }

  return 0;
}

function parseYoutubeAbsoluteDateToTimestamp(text: string): number {
  if (!text) return 0;
  const raw = stripSpaces(text);
  const cn = raw.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (cn) {
    const y = Number.parseInt(cn[1], 10);
    const m = Number.parseInt(cn[2], 10) - 1;
    const d = Number.parseInt(cn[3], 10);
    return new Date(y, m, d).getTime();
  }
  const en = Date.parse(text);
  return Number.isNaN(en) ? 0 : en;
}

function textFromRunsNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const rec = node as UnknownRecord;
  const simpleText = rec.simpleText;
  if (typeof simpleText === "string") return simpleText.trim();

  const runs = rec.runs;
  if (Array.isArray(runs)) {
    return runs
      .map((item) =>
        item && typeof item === "object" && typeof (item as UnknownRecord).text === "string"
          ? String((item as UnknownRecord).text)
          : "",
      )
      .join("")
      .trim();
  }
  return "";
}

function extractVideoIdFromHref(href: string): string {
  if (!href) return "";
  try {
    const url = href.startsWith("http")
      ? new URL(href)
      : new URL(href, "https://www.youtube.com");
    if (url.pathname === "/watch") return url.searchParams.get("v") ?? "";
    const shorts = url.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1];
    return "";
  } catch {
    return "";
  }
}

export function parseYoutubeVideoFromDom(el: Element): YoutubeVideoItem | null {
  const titleLink =
    el.querySelector<HTMLAnchorElement>("a#video-title-link") ??
    el.querySelector<HTMLAnchorElement>("a#video-title") ??
    el.querySelector<HTMLAnchorElement>('a[href*="/watch?v="]');

  const rawHref = titleLink?.getAttribute("href") ?? "";
  const videoId = extractVideoIdFromHref(rawHref);
  if (!videoId) return null;

  const href = rawHref.startsWith("http")
    ? rawHref
    : `https://www.youtube.com${rawHref}`;

  const title =
    titleLink?.getAttribute("title")?.trim() ??
    titleLink?.textContent?.trim() ??
    el
      .querySelector<HTMLElement>(
        "#video-title, #video-title-link, yt-formatted-string#video-title",
      )
      ?.textContent?.trim() ??
    "";

  // 兼容你截图里的结构：ytd-video-meta-block > span.inline-metadata-item
  const metadataSpans = Array.from(
    el.querySelectorAll<HTMLElement>(
      [
        "#metadata-line span",
        "#metadata-line .inline-metadata-item",
        "#meta #metadata-line span",
        "ytd-video-meta-block #metadata-line span",
        "ytd-video-meta-block span.inline-metadata-item",
        "span.inline-metadata-item.style-scope.ytd-video-meta-block",
      ].join(", "),
    ),
  )
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);

  const viewText =
    metadataSpans.find((item) => /观看|views?/i.test(item)) ??
    "";
  const relativeText =
    metadataSpans.find((item) => /前|ago/i.test(item)) ??
    "";

  let publishTime = parseYoutubeRelativeTimeToTimestamp(relativeText);
  if (!publishTime) {
    publishTime = parseYoutubeAbsoluteDateToTimestamp(relativeText);
  }

  return {
    videoId,
    title,
    viewCount: parseYoutubeCount(viewText),
    publishTime,
    publishRelativeText: relativeText,
    href,
  };
}

function parseYoutubeVideoFromRenderer(renderer: unknown): YoutubeVideoItem | null {
  if (!renderer || typeof renderer !== "object") return null;
  const rec = renderer as UnknownRecord;

  const videoId = typeof rec.videoId === "string" ? rec.videoId : "";
  if (!videoId) return null;

  const title = textFromRunsNode(rec.title);

  const navigationEndpoint =
    rec.navigationEndpoint && typeof rec.navigationEndpoint === "object"
      ? (rec.navigationEndpoint as UnknownRecord)
      : null;
  const webMeta =
    navigationEndpoint?.commandMetadata &&
    typeof navigationEndpoint.commandMetadata === "object"
      ? (navigationEndpoint.commandMetadata as UnknownRecord).webCommandMetadata
      : null;
  const webMetaRec =
    webMeta && typeof webMeta === "object" ? (webMeta as UnknownRecord) : null;
  const rawHref =
    (typeof webMetaRec?.url === "string" && webMetaRec.url) ||
    (videoId ? `/watch?v=${videoId}` : "");

  const href = rawHref.startsWith("http")
    ? rawHref
    : `https://www.youtube.com${rawHref}`;

  const viewText =
    textFromRunsNode(rec.viewCountText) ||
    textFromRunsNode(rec.shortViewCountText);
  const publishRelativeText = textFromRunsNode(rec.publishedTimeText);

  let publishTime = parseYoutubeRelativeTimeToTimestamp(publishRelativeText);
  if (!publishTime) {
    publishTime = parseYoutubeAbsoluteDateToTimestamp(publishRelativeText);
  }

  return {
    videoId,
    title,
    viewCount: parseYoutubeCount(viewText),
    publishTime,
    publishRelativeText,
    href,
  };
}

function collectVideoRenderers(root: unknown): unknown[] {
  if (!root || typeof root !== "object") return [];
  const out: unknown[] = [];
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;

    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }

    const rec = cur as UnknownRecord;
    if (rec.videoRenderer && typeof rec.videoRenderer === "object") {
      out.push(rec.videoRenderer);
    }
    for (const value of Object.values(rec)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }

  return out;
}

export function parseYoutubeVideosFromInitialData(
  raw: unknown,
): YoutubeVideoItem[] {
  const renderers = collectVideoRenderers(raw);
  if (renderers.length === 0) return [];

  const seen = new Set<string>();
  const result: YoutubeVideoItem[] = [];

  for (const renderer of renderers) {
    const item = parseYoutubeVideoFromRenderer(renderer);
    if (!item) continue;
    if (seen.has(item.videoId)) continue;
    seen.add(item.videoId);
    result.push(item);
  }

  return result;
}
