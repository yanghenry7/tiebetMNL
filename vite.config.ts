
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 必須與您的 GitHub 儲存庫名稱（區分大小寫）一致
  base: '/TiebetMNL/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
