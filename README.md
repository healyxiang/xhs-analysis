# WXT + React

This template should help get you started developing with React in WXT.

## 小红书发布时间获取原理（通过 noteId）

当前插件并不是从页面可见文案里抓取“发布日期”，而是通过小红书 `noteId` 反推出发布时间：

- 小红书 `noteId` 的前 8 位十六进制，表示 Unix 秒级时间戳
- 解析前 8 位后转成十进制秒数，再乘 `1000` 得到毫秒时间戳
- 最终写入 `publishTime` 字段，用于列表展示与图表排序

示例代码（`src/types/note.ts`）：

```ts
export function noteIdToTimestamp(noteId: string): number {
  if (!noteId || noteId.length < 8) return 0;
  const hex = noteId.slice(0, 8);
  const sec = parseInt(hex, 16);
  return isNaN(sec) ? 0 : sec * 1000;
}
```

在 DOM 解析时会把该值写入结果对象：

```ts
const result = {
  noteId,
  title,
  likedCount,
  publishTime: noteIdToTimestamp(noteId),
  href,
};
```
