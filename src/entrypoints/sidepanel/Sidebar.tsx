import { useState, useEffect, useRef } from 'react';
import NoteList from './NoteList';
import LikeChart from './LikeChart';
import { noteStore } from '../../utils/noteStore';
import type { BloggerStats } from '../../utils/noteStore';
import { youtubeStore } from '../../utils/youtubeStore';
import type { YoutubeBloggerStats } from '../../utils/youtubeStore';
import type { ListItem } from './NoteList';

type Tab = 'list' | 'chart';
type Platform = 'xhs' | 'youtube';

function platformFromUrl(url?: string): Platform {
  if (url?.includes('youtube.com')) return 'youtube';
  return 'xhs';
}

function Sidebar() {
  const [tab, setTab] = useState<Tab>('list');
  const [platform, setPlatform] = useState<Platform>('xhs');
  const [splitView, setSplitView] = useState(true);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [xhsNotes, setXhsNotes] = useState(noteStore.get());
  const [ytVideos, setYtVideos] = useState(youtubeStore.get());

  const [xhsBlogger, setXhsBlogger] = useState(noteStore.getBlogger());
  const [xhsStats, setXhsStats] = useState<BloggerStats>(noteStore.getStats());
  const [ytBlogger, setYtBlogger] = useState(youtubeStore.getBlogger());
  const [ytStats, setYtStats] = useState<YoutubeBloggerStats>(youtubeStore.getStats());
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const unsubXhs = noteStore.subscribe((updated) => setXhsNotes([...updated]));
    const unsubYt = youtubeStore.subscribe((updated) => setYtVideos([...updated]));
    const unsubXhsBlogger = noteStore.subscribeBlogger((name, s) => {
      setXhsBlogger(name);
      setXhsStats(s);
    });
    const unsubYtBlogger = youtubeStore.subscribeBlogger((name, s) => {
      setYtBlogger(name);
      setYtStats(s);
    });

    return () => {
      unsubXhs();
      unsubYt();
      unsubXhsBlogger();
      unsubYtBlogger();
    };
  }, []);

  // 兜底：侧边栏打开时，从 session 恢复已采集数据（避免错过 content script 首次消息）
  useEffect(() => {
    browser.storage.session
      .get([
        'xhs_notes',
        'xhs_blogger',
        'xhs_stats',
        'yt_videos',
        'yt_blogger',
        'yt_stats',
      ])
      .then((result) => {
        const xhsNotesStored = Array.isArray(result.xhs_notes) ? result.xhs_notes : [];
        const ytVideosStored = Array.isArray(result.yt_videos) ? result.yt_videos : [];
        setXhsNotes(xhsNotesStored as typeof xhsNotes);
        setYtVideos(ytVideosStored as typeof ytVideos);
        if (typeof result.xhs_blogger === 'string') setXhsBlogger(result.xhs_blogger);
        if (result.xhs_stats) setXhsStats(result.xhs_stats as BloggerStats);
        if (typeof result.yt_blogger === 'string') setYtBlogger(result.yt_blogger);
        if (result.yt_stats) setYtStats(result.yt_stats as YoutubeBloggerStats);
      })
      .finally(() => setBootstrapped(true));
  }, []);

  useEffect(() => {
    const updateActivePlatform = () => {
      browser.windows.getCurrent().then((win) => {
        browser.tabs.query({ active: true, windowId: win.id }).then((tabs) => {
          setPlatform(platformFromUrl(tabs[0]?.url));
        });
      });
    };

    updateActivePlatform();
    browser.tabs.onActivated.addListener(updateActivePlatform);
    browser.tabs.onUpdated.addListener(updateActivePlatform);

    return () => {
      browser.tabs.onActivated.removeListener(updateActivePlatform);
      browser.tabs.onUpdated.removeListener(updateActivePlatform);
    };
  }, []);

  const isYoutube = platform === 'youtube';
  const blogger = isYoutube ? ytBlogger : xhsBlogger;
  const listItems: ListItem[] = isYoutube
    ? ytVideos.map((v) => ({
        id: v.videoId,
        title: v.title,
        publishTime: v.publishTime,
        metricCount: v.viewCount,
        href: v.href,
      }))
    : xhsNotes.map((n) => ({
        id: n.noteId,
        title: n.title,
        publishTime: n.publishTime,
        metricCount: n.likedCount,
        href: n.href,
      }));
  const metricLabel = isYoutube ? '观看量' : '点赞数';
  const metricIcon = isYoutube ? '👀' : '❤️';
  const title = '⏱️ CreatorTimeline';
  const subtitle = '跨平台内容创作者时间线分析';
  const platformName = isYoutube ? 'YouTube' : '小红书';
  const bloggerDisplay = blogger
    ? `${platformName} · ${blogger}`
    : `${platformName} · ${isYoutube ? '请打开频道 videos 页面' : '请打开博主主页'}`;

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    }
    function onMouseUp() { isDragging.current = false; }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // 兜底：首次识别到平台后，自动触发一次采集刷新，避免”页面已渲染但没新 mutation”导致空数据
  useEffect(() => {
    if (!bootstrapped) return;
    if (isYoutube) {
      youtubeStore.sendRefreshToContentScript();
    } else {
      noteStore.sendRefreshToContentScript();
    }
  }, [bootstrapped, isYoutube]);

  function handleRefresh() {
    setRefreshing(true);
    if (isYoutube) {
      youtubeStore.sendRefreshToContentScript();
    } else {
      noteStore.sendRefreshToContentScript();
    }
    // 1.5s 后恢复按钮状态（实际数据到了会更新，这里只是动画）
    setTimeout(() => setRefreshing(false), 1500);
  }

  function handleClear() {
    if (isYoutube) {
      youtubeStore.clear();
    } else {
      noteStore.clear();
    }
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
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title} · {subtitle}
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
            {bloggerDisplay}
          </div>
          {isYoutube
            ? (ytStats.subscribers || ytStats.videoCount) && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', display: 'flex', gap: '10px' }}>
                  {ytStats.subscribers && <span>{ytStats.subscribers}</span>}
                  {ytStats.videoCount && <span>{ytStats.videoCount}</span>}
                </div>
              )
            : (xhsStats.following || xhsStats.followers || xhsStats.likes) && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', display: 'flex', gap: '10px' }}>
                  {xhsStats.following && <span>{xhsStats.following} 关注</span>}
                  {xhsStats.followers && <span>{xhsStats.followers} 粉丝</span>}
                  {xhsStats.likes && <span>{xhsStats.likes} 获赞与收藏</span>}
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
        {isYoutube
          ? '💡 滚动频道 videos 页面自动采集 · 换频道后点 🔄 重新采集'
          : '💡 滚动博主主页自动采集 · 换博主后点 🔄 重新采集'}
      </div>

      {/* Tab 切换 + 并列按钮 */}
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
            onClick={() => { if (!splitView) setTab(key); }}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: '13px',
              fontWeight: !splitView && tab === key ? 600 : 400,
              color: splitView ? '#ccc' : tab === key ? '#fe2c55' : '#888',
              background: 'none',
              border: 'none',
              borderBottom: !splitView && tab === key ? '2px solid #fe2c55' : '2px solid transparent',
              cursor: splitView ? 'default' : 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setSplitView((v) => !v)}
          style={{
            padding: '9px 10px',
            fontSize: '12px',
            fontWeight: splitView ? 600 : 400,
            color: splitView ? '#fe2c55' : '#888',
            background: 'none',
            border: 'none',
            borderBottom: splitView ? '2px solid #fe2c55' : '2px solid transparent',
            borderLeft: '1px solid #f0f0f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
        >
          {splitView ? '☑ 并列' : '☐ 并列'}
        </button>
      </div>

      {/* 内容区 */}
      <div ref={contentRef} style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {splitView ? (
          <>
            <div style={{ width: `${splitRatio * 100}%`, overflow: 'hidden', flexShrink: 0 }}>
              <NoteList
                items={listItems}
                metricLabel={metricLabel}
                metricIcon={metricIcon}
                onClear={handleClear}
                platform={platform}
              />
            </div>
            <div
              onMouseDown={(e) => { isDragging.current = true; e.preventDefault(); }}
              style={{
                width: '5px',
                flexShrink: 0,
                cursor: 'col-resize',
                backgroundColor: '#f0f0f0',
                borderLeft: '1px solid #e0e0e0',
                borderRight: '1px solid #e0e0e0',
              }}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <LikeChart items={listItems} metricLabel={metricLabel} platform={platform} />
            </div>
          </>
        ) : tab === 'list' ? (
          <NoteList
            items={listItems}
            metricLabel={metricLabel}
            metricIcon={metricIcon}
            onClear={handleClear}
            platform={platform}
          />
        ) : (
          <LikeChart items={listItems} metricLabel={metricLabel} platform={platform} />
        )}
      </div>
    </div>
  );
}

export default Sidebar;
