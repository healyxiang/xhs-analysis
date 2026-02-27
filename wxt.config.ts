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
  // 禁用启动新浏览器的逻辑
  runner: {
    disabled: true,
  },
});
