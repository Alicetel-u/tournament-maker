import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({ base: '/tournament-maker/', css: { postcss: { plugins: [tailwindcss()] } }, plugins: [react()] });
