import { defineConfig } from "vite";
export default defineConfig({
  server: { allowedHosts: ["terminal.local"] },
  build: {
    rollupOptions: {
      output: { manualChunks: { supabase: ["@supabase/supabase-js"] } },
    },
  },
});
