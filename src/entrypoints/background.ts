export default defineBackground(() => {
  // 点击扩展图标时打开 Side Panel
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
