import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    fontFamily: {
      sans: [
        "Noto Sans SC",
        "PingFang SC",
        "Microsoft YaHei",
        "Source Han Sans SC",
        "Helvetica Neue",
        "Helvetica",
        "Arial",
        "sans-serif"
      ],
      mono: [
        "JetBrains Mono",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        "monospace"
      ]
    },
    extend: {}
  },
  plugins: []
};

export default config;
