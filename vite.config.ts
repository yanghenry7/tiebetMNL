
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 如果您的專案位於 https://yanghenry7.github.io/tiebetMNL/
// 則 base 必須設定為 '/tiebetMNL/'
export default defineConfig({
  plugins: [react()],
  base: '/tiebetMNL/',
});
