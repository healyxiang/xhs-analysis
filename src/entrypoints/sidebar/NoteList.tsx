import { useEffect, useState } from 'react';
import { noteStore } from '../../utils/noteStore';
import type { NoteItem } from '../../types/note';

function formatTime(ms: number): string {
  if (!ms) return '未知';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}

export default function NoteList() {
  const [notes, setNotes] = useState<NoteItem[]>(noteStore.get());
  const [sortBy, setSortBy] = useState<'time' | 'liked'>('time');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    return noteStore.subscribe((updated) => setNotes([...updated]));
  }, []);

  function handleSortClick(key: 'time' | 'liked') {
    if (key === sortBy) {
      // 再次点击同一个：切换升降序
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      // 切换到另一个：默认降序
      setSortBy(key);
      setSortDir('desc');
    }
  }

  const sorted = [...notes].sort((a, b) => {
    const diff =
      sortBy === 'time'
        ? a.publishTime - b.publishTime
        : a.likedCount - b.likedCount;
    return sortDir === 'desc' ? -diff : diff;
  });

  if (notes.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
        <p style={{ margin: 0, fontSize: '13px' }}>
          浏览博主主页后数据会自动出现
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 排序控制栏 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid #f0f0f0',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', color: '#888', marginRight: '4px' }}>
          共 {notes.length} 篇
        </span>
        <span style={{ fontSize: '12px', color: '#888' }}>排序：</span>
        {(['time', 'liked'] as const).map((key) => {
          const isActive = sortBy === key;
          const arrow = isActive ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
          return (
            <button
              key={key}
              onClick={() => handleSortClick(key)}
              style={{
                padding: '3px 10px',
                fontSize: '12px',
                border: '1px solid',
                borderColor: isActive ? '#fe2c55' : '#ddd',
                borderRadius: '12px',
                background: isActive ? '#fe2c55' : '#fff',
                color: isActive ? '#fff' : '#666',
                cursor: 'pointer',
              }}
            >
              {key === 'time' ? '发布时间' : '点赞数'}{arrow}
            </button>
          );
        })}
        <button
          onClick={() => noteStore.clear()}
          style={{
            marginLeft: 'auto',
            padding: '3px 8px',
            fontSize: '12px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            background: '#fff',
            color: '#999',
            cursor: 'pointer',
          }}
        >
          清空
        </button>
      </div>

      {/* 笔记列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.map((note, i) => (
          <a
            key={note.noteId}
            href={note.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              padding: '10px 12px',
              borderBottom: '1px solid #f5f5f5',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {/* 序号 */}
            <div
              style={{
                minWidth: '20px',
                height: '20px',
                borderRadius: '50%',
                background: i < 3 ? '#fe2c55' : '#efefef',
                color: i < 3 ? '#fff' : '#999',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '3px',
              }}
            >
              {i + 1}
            </div>

            {/* 内容 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1a1a1a',
                  marginBottom: '5px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={note.title}
              >
                {note.title || '（无标题）'}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#888' }}>
                <span>🕐 {formatTime(note.publishTime)}</span>
                <span>❤️ {formatCount(note.likedCount)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
