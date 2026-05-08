import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://whatsforlunch.app',
  integrations: [tailwind(), mdx()],
  compressHTML: true,
});
