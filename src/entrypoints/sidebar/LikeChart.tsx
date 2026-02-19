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
import { noteStore } from '../../utils/noteStore';
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
  date: string;       // X 轴显示：yyyy-mm-dd
  title: string;      // tooltip 显示完整标题
  likes: number;      // Y 轴
  ts: number;         // 原始时间戳，用于排序
}

// 自定义 Tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint; value: number }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '4px',
          wordBreak: 'break-all',
          whiteSpace: 'normal',
        }}
      >
        {d.title || '（无标题）'}
      </div>
      <div style={{ color: '#fe2c55', marginBottom: '4px' }}>❤️ {formatCount(d.likes)}</div>
      <div style={{ color: '#999' }}>📅 {d.date}</div>
    </div>
  );
}

export default function LikeChart() {
  const [notes, setNotes] = useState<NoteItem[]>(noteStore.get());

  useEffect(() => {
    return noteStore.subscribe((updated) => setNotes([...updated]));
  }, []);

  if (notes.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#bbb' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6 }}>
          打开博主主页后<br />数据会自动出现
        </p>
      </div>
    );
  }

  // 按时间升序排列（折线图左→右 = 旧→新）
  const data: ChartPoint[] = [...notes]
    .sort((a, b) => a.publishTime - b.publishTime)
    .map((n) => ({
      date: formatDate(n.publishTime),
      title: n.title,
      likes: n.likedCount,
      ts: n.publishTime,
    }));

  return (
    <div style={{ padding: '12px 4px 8px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 12px 8px', fontSize: '12px', color: '#999' }}>
        共 <b style={{ color: '#fe2c55' }}>{notes.length}</b> 篇 · 按发布时间排列
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#999' }}
              angle={-45}
              textAnchor="end"
              interval="preserveStartEnd"
              height={64}
            />

            <YAxis
              tickFormatter={formatCount}
              tick={{ fontSize: 10, fill: '#999' }}
              width={40}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="likes"
              stroke="#fe2c55"
              strokeWidth={2}
              dot={{ r: 3, fill: '#fe2c55', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#fe2c55' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
