import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  outDir: "output",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name:
      process.env.NODE_ENV === "development"
        ? "[DEV] 小红书数据分析"
        : "小红书数据分析",
    permissions: ["sidePanel", "storage", "tabs"],
  },

  vite: () => ({
    plugins: [tailwindcss()],
  }),
  // 使用独立的 Dev Profile，保留小红书登录态
  // 与日常 Chrome 互不干扰，无需退出 Chrome 再运行 pnpm dev
  // 首次使用若登录态失效，在弹出的浏览器中重新登录小红书即可（只需一次）
  browser: "chrome",
  runner: {
    chromiumProfile: `${process.env.HOME}/Library/Application Support/Google/Chrome/XhsDevProfile`,
    startUrls: ["https://www.xiaohongshu.com"],
  },
});
