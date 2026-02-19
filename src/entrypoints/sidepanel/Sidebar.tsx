import { useState, useEffect } from 'react';
import NoteList from './NoteList';
import LikeChart from './LikeChart';
import { noteStore } from '../../utils/noteStore';
import type { BloggerStats } from '../../utils/noteStore';

type Tab = 'list' | 'chart';

function Sidebar() {
  const [tab, setTab] = useState<Tab>('list');
  const [blogger, setBlogger] = useState(noteStore.getBlogger());
  const [stats, setStats] = useState<BloggerStats>(noteStore.getStats());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return noteStore.subscribeBlogger((name, s) => {
      setBlogger(name);
      setStats(s);
    });
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    noteStore.sendRefreshToContentScript();
    // 1.5s 后恢复按钮状态（实际数据到了会更新，这里只是动画）
    setTimeout(() => setRefreshing(false), 1500);
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: '#fe2c55',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '1px' }}>
            📊 小红书数据分析
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {blogger || '请打开博主主页'}
          </div>
          {/* 博主数据：关注 / 粉丝 / 获赞 */}
          {(stats.following || stats.followers || stats.likes) && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', display: 'flex', gap: '10px' }}>
              {stats.following && <span>{stats.following} 关注</span>}
              {stats.followers && <span>{stats.followers} 粉丝</span>}
              {stats.likes    && <span>{stats.likes} 获赞与收藏</span>}
            </div>
          )}
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="清空数据，重新采集当前博主"
          style={{
            flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '16px',
            width: '32px',
            height: '32px',
            cursor: refreshing ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s',
            opacity: refreshing ? 0.5 : 1,
            animation: refreshing ? 'xhs-spin 0.8s linear infinite' : 'none',
          }}
        >
          🔄
        </button>
      </div>

      {/* spin 动画 */}
      <style>{`
        @keyframes xhs-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* 说明提示 */}
      <div
        style={{
          padding: '6px 12px',
          backgroundColor: '#fff8f8',
          borderBottom: '1px solid #f0f0f0',
          fontSize: '11px',
          color: '#fe2c55',
          flexShrink: 0,
        }}
      >
        💡 滚动博主主页自动采集 · 换博主后点 🔄 重新采集
      </div>

      {/* Tab 切换 */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
          backgroundColor: '#fff',
        }}
      >
        {([['list', '列表'], ['chart', '趋势图']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: '13px',
              fontWeight: tab === key ? 600 : 400,
              color: tab === key ? '#fe2c55' : '#888',
              background: 'none',
              border: 'none',
              borderBottom: tab === key ? '2px solid #fe2c55' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'list' ? <NoteList /> : <LikeChart />}
      </div>
    </div>
  );
}

export default Sidebar;
