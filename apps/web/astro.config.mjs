import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://whatsforlunch.app',
  integrations: [tailwind(), mdx(), sitemap()],
  compressHTML: true,
});
