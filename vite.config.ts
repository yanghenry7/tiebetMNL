
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 必須與您的 GitHub 儲存庫名稱一致，確保靜態資源載入正確
  base: '/tiebetMNL/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
