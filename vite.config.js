import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    watch: {
      ignored: ['**/LOGO/**', '**/ccaroucelle image/**', '**/.agents/**', '**/dist/**']
    }
  }
});
