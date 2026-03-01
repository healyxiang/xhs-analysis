import { useState } from 'react';
import NoteList from './NoteList';
import LikeChart from './LikeChart';

interface SidebarProps {
  onClose: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

type Tab = 'list' | 'chart';

function Sidebar({ onClose, onToggleFullscreen, isFullscreen }: SidebarProps) {
  const [tab, setTab] = useState<Tab>('list');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
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
          padding: '12px 16px',
          backgroundColor: '#fe2c55',
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
          ⏱️ CreatorTimeline
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '14px',
                lineHeight: 1,
                padding: '4px 8px',
                borderRadius: '4px',
              }}
              title={isFullscreen ? '退出全屏' : '全屏展开'}
            >
              {isFullscreen ? '⊡' : '⊞'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '16px',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: '4px',
            }}
            title="关闭侧边栏"
          >
            ×
          </button>
        </div>
      </div>

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
        💡 打开/滚动博主主页，笔记数据将自动收集
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
