import type { Config } from "tailwindcss";

export default {
  content: [
    // howl structure — pages, islands, components
    "./pages/**/*.{ts,tsx}",
    "./islands/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./layouts/**/*.{ts,tsx}",
  ],
} satisfies Config;
