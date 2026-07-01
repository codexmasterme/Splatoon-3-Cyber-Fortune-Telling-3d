import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 如果部署到 GitHub Pages 的子路径（如 https://用户名.github.io/cyber-omikuji/），
// 把 base 改成 "/cyber-omikuji/"。用自定义域名或根路径则保持 "/"。
export default defineConfig({
  plugins: [react()],
  base: "/Splatoon-3-Cyber-Fortune-Telling-3d/",
});
