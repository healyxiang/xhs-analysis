import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { NoteItem } from '../../types/note';

function formatDate(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}

interface ChartPoint {
  date: string;
  title: string;
  likes: number;
  ts: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint; value: number }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '13px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        maxWidth: '280px',
      }}
    >
      <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '6px', wordBreak: 'break-all', whiteSpace: 'normal' }}>
        {d.title || '（无标题）'}
      </div>
      <div style={{ color: '#fe2c55', marginBottom: '4px' }}>❤️ {formatCount(d.likes)}</div>
      <div style={{ color: '#999' }}>📅 {d.date}</div>
    </div>
  );
}

export default function FullscreenChart() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 chrome.storage.session 读取数据
    browser.storage.session.get('xhs_notes').then((result) => {
      const stored = result['xhs_notes'];
      if (Array.isArray(stored)) {
        setNotes(stored as NoteItem[]);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontSize: '14px' }}>
        加载中...
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#bbb' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <p style={{ margin: 0, fontSize: '14px' }}>暂无数据，请先在侧边栏收集笔记</p>
      </div>
    );
  }

  const data: ChartPoint[] = [...notes]
    .sort((a, b) => a.publishTime - b.publishTime)
    .map((n) => ({
      date: formatDate(n.publishTime),
      title: n.title,
      likes: n.likedCount,
      ts: n.publishTime,
    }));

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#fe2c55',
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
          📊 点赞趋势图
        </h1>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
          共 <b style={{ color: '#fff' }}>{notes.length}</b> 篇 · 按发布时间排列
        </span>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, padding: '24px 16px 16px', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 32, bottom: 80, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#999' }}
              angle={-45}
              textAnchor="end"
              interval="preserveStartEnd"
              height={80}
            />
            <YAxis
              tickFormatter={formatCount}
              tick={{ fontSize: 11, fill: '#999' }}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="likes"
              stroke="#fe2c55"
              strokeWidth={2}
              dot={{ r: 4, fill: '#fe2c55', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#fe2c55' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
