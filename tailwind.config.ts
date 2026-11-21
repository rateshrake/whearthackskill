import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/engine/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Color-blind safe tokens (Okabe-Ito / Tol palette tailored for air quality)
        aqi: {
          good: "#009E73", // Accessible bluish green
          moderate: "#E69F00", // Accessible amber/orange
          usg: "#D55E00", // Vermilion / deep amber-orange
          unhealthy: "#CC79A7", // Accessible purple / magenta
          veryUnhealthy: "#7828C8", // Deep Violet
          hazardous: "#7F0000", // Deep Maroon / Dark Burgundy
          cpcbPoor: "#E66101",
          cpcbVeryPoor: "#B2182B",
          cpcbSevere: "#67001F",
        },
      },
    },
  },
  plugins: [],
};
export default config;
