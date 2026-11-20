import { defineConfig } from 'vite';

// base './' để thư mục dist/ chạy được ở mọi đường dẫn (Release zip, GitHub Pages, mở qua scripts/run.js).
export default defineConfig({ base: './' });
