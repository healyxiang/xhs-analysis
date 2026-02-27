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
import type { BloggerStats } from '../../utils/noteStore';
import type { YoutubeVideoItem } from '../../types/youtube';
import type { YoutubeBloggerStats } from '../../utils/youtubeStore';

type Platform = 'xhs' | 'youtube';

interface DisplayItem {
  id: string;
  title: string;
  publishTime: number;
  href: string;
  metric: number;
}

interface ChartPoint {
  date: string;
  title: string;
  metric: number;
}

// 自定义 Tooltip（与 sidepanel 中的 LikeChart 对齐）
function CustomTooltip({ active, payload, metricLabel, metricIcon }: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint; value: number }>;
  metricLabel?: string;
  metricIcon?: string;
}) {
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
        maxWidth: '280px',
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
      <div style={{ color: '#fe2c55', marginBottom: '4px' }}>
        {metricIcon || '📈'} {metricLabel || '数据'}: {formatCount(d.metric)}
      </div>
      <div style={{ color: '#999' }}>📅 {d.date}</div>
    </div>
  );
}

function formatDate(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return String(n);
}

function formatTime(ms: number): string {
  if (!ms) return '未知';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FullscreenChartPage() {
  const [platform, setPlatform] = useState<Platform>('xhs');
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [blogger, setBlogger] = useState('');
  const [xhsStats, setXhsStats] = useState<BloggerStats>({ following: '', followers: '', likes: '' });
  const [ytStats, setYtStats] = useState<YoutubeBloggerStats>({ subscribers: '', videoCount: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('platform');
    const currentPlatform: Platform = p === 'youtube' ? 'youtube' : 'xhs';
    setPlatform(currentPlatform);

    // 根据平台动态设置窗口标题
    document.title = currentPlatform === 'youtube'
      ? '趋势图 - YouTube 数据分析'
      : '趋势图 - 小红书数据分析';

    const keys =
      currentPlatform === 'youtube'
        ? ['yt_videos', 'yt_blogger', 'yt_stats']
        : ['xhs_notes', 'xhs_blogger', 'xhs_stats'];

    browser.storage.session.get(keys).then((result) => {
      if (currentPlatform === 'youtube') {
        const videos = Array.isArray(result.yt_videos) ? (result.yt_videos as YoutubeVideoItem[]) : [];
        setItems(
          videos.map((v) => ({
            id: v.videoId,
            title: v.title,
            publishTime: v.publishTime,
            href: v.href,
            metric: v.viewCount,
          })),
        );
        if (result.yt_blogger) setBlogger(result.yt_blogger as string);
        if (result.yt_stats) setYtStats(result.yt_stats as YoutubeBloggerStats);
      } else {
        const notes = Array.isArray(result.xhs_notes) ? (result.xhs_notes as NoteItem[]) : [];
        setItems(
          notes.map((n) => ({
            id: n.noteId,
            title: n.title,
            publishTime: n.publishTime,
            href: n.href,
            metric: n.likedCount,
          })),
        );
        if (result.xhs_blogger) setBlogger(result.xhs_blogger as string);
        if (result.xhs_stats) setXhsStats(result.xhs_stats as BloggerStats);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999' }}>加载中...</div>;
  if (items.length === 0) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#bbb' }}>暂无数据，请先在侧边栏收集数据</div>;

  const metricLabel = platform === 'youtube' ? '观看量' : '点赞数';
  const metricIcon = platform === 'youtube' ? '👀' : '❤️';
  const data = [...items].sort((a, b) => a.publishTime - b.publishTime);

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#fe2c55' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            {platform === 'youtube' ? '📺 观看趋势图' : '📊 点赞趋势图'}
          </h1>
          {blogger && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.9)', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.3)' }}>
              <span style={{ fontWeight: 600 }}>{blogger}</span>
              {platform === 'youtube'
                ? <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{ytStats.subscribers} {ytStats.videoCount}</span>
                : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{xhsStats.following} {xhsStats.followers} {xhsStats.likes}</span>}
            </div>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>共 <b style={{ color: '#fff' }}>{items.length}</b> 篇</span>
      </div>

      <div style={{ height: '520px', padding: '20px 16px 12px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.map((n) => ({
              date: formatDate(n.publishTime),
              title: n.title,
              metric: n.metric,
            }))}
            margin={{ top: 8, right: 32, bottom: 60, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} angle={-45} textAnchor="end" interval="preserveStartEnd" height={70} />
            <YAxis tickFormatter={formatCount} tick={{ fontSize: 11, fill: '#999' }} width={52} />
            <Tooltip content={<CustomTooltip metricLabel={metricLabel} metricIcon={metricIcon} />} />
            <Line type="linear" dataKey="metric" stroke="#fe2c55" strokeWidth={2} dot={{ r: 4, fill: '#fe2c55', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fe2c55' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '18px' }}>
          <h2 style={{ margin: 0, marginBottom: '12px', fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            {platform === 'youtube' ? '🎬 视频列表' : '📝 笔记列表'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.map((item, i) => (
              <a key={item.id} href={item.href} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f9f9f9', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: i < 3 ? '#fe2c55' : '#efefef', color: i < 3 ? '#fff' : '#999', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title || '（无标题）'}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#888', flexShrink: 0 }}>
                    <span style={{ minWidth: '120px' }}>{formatTime(item.publishTime)}</span>
                    <span style={{ color: '#fe2c55', fontWeight: 500, minWidth: '100px', textAlign: 'right' }}>
                      {metricIcon} {formatCount(item.metric)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>指标：{metricLabel}</div>
        </div>
      </div>
    </div>
  );
}
