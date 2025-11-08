import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./meetmate-web/**/*.{js,ts,jsx,tsx}",
    "./meetmate-admin/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        primary: {
          DEFAULT: "var(--primary-600)",
          100: "var(--primary-100)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
        },
        accent: {
          DEFAULT: "var(--accent-600)",
          100: "var(--accent-100)",
          600: "var(--accent-600)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
