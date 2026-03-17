import type { Config } from "tailwindcss";

export default {
  content: [
    // Harmony structure — pages, islands, components
    "./pages/**/*.{ts,tsx}",
    "./islands/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./layouts/**/*.{ts,tsx}",
  ],
} satisfies Config;
