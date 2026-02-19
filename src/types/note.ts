// DOM 抓取到的笔记数据
export interface NoteItem {
  noteId: string;
  title: string;
  likedCount: number;
  publishTime: number; // 毫秒时间戳，从 noteId 前4字节解析
  href: string; // 笔记链接
}

/**
 * 小红书 noteId 前 8 位十六进制 = Unix 秒时间戳
 * 例：698f4ea2... → 0x698f4ea2 = 1771261602 秒
 */
export function noteIdToTimestamp(noteId: string): number {
  if (!noteId || noteId.length < 8) return 0;
  const hex = noteId.slice(0, 8);
  const sec = parseInt(hex, 16);
  return isNaN(sec) ? 0 : sec * 1000;
}

/**
 * 从 section.note-item 元素中提取笔记数据
 */
export function parseNoteFromDom(el: Element): NoteItem | null {
  // 优先用封面可点击链接 (a.cover)，它包含带有效 xsec_token 的真实 URL
  // 格式：/user/profile/{userId}/{noteId}?xsec_token=...
  // 备用：隐藏的 /explore/{noteId} 链接（无 token 会 404）
  const coverLink =
    el.querySelector<HTMLAnchorElement>("a.cover") ??
    el.querySelector<HTMLAnchorElement>('a[href*="/explore/"]');
  let noteId = "";
  let href = "";

  if (coverLink) {
    const raw = coverLink.getAttribute("href") ?? "";
    // 从路径末尾提取 noteId（user/profile 格式 或 explore 格式）
    const m = raw.match(/\/([0-9a-f]{24})(?:\?|$)/i);
    if (m) {
      noteId = m[1];
      href = raw.startsWith("http") ? raw : `https://www.xiaohongshu.com${raw}`;
    }
  }

  if (!noteId) return null;

  // 标题
  const titleEl = el.querySelector("a.title");
  const title = titleEl?.textContent?.trim() ?? "";

  // 点赞数：span.count（在 like-wrapper 内）
  const countEl = el.querySelector("span.count");
  const countText = countEl?.textContent?.trim() ?? "0";
  // 小红书显示格式：纯数字 或 "1.2万"
  const likedCount = parseXhsCount(countText);

  const result = {
    noteId,
    title,
    likedCount,
    publishTime: noteIdToTimestamp(noteId),
    href,
  };
  console.log(
    `[xhs-analysis] ${result.title.slice(0, 20)} | id: ${result.noteId}`,
  );
  console.log(`[xhs-analysis] href: ${result.href}`);
  return result;
}

function parseXhsCount(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned.includes("万")) {
    return Math.round(parseFloat(cleaned) * 10000);
  }
  return parseInt(cleaned, 10) || 0;
}
