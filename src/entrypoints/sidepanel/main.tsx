import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidebar from './Sidebar';
import '@/assets/tailwind.css';
import { noteStore } from '../../utils/noteStore';

// 监听来自 content script 的笔记数据
noteStore.listenFromContentScript();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sidebar />
  </React.StrictMode>,
);
