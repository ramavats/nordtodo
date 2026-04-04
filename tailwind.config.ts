import type { Config } from "tailwindcss";

// Nord Palette — canonical color values
// https://www.nordtheme.com/docs/colors-and-palettes
const nord = {
  // Polar Night (dark backgrounds)
  nord0: "#2E3440",
  nord1: "#3B4252",
  nord2: "#434C5E",
  nord3: "#4C566A",
  // Snow Storm (light text / surfaces in dark mode)
  nord4: "#D8DEE9",
  nord5: "#E5E9F0",
  nord6: "#ECEFF4",
  // Frost (accent blues)
  nord7: "#8FBCBB",
  nord8: "#88C0D0",
  nord9: "#81A1C1",
  nord10: "#5E81AC",
  // Aurora (semantic colors)
  nord11: "#BF616A", // red / error
  nord12: "#D08770", // orange / warning
  nord13: "#EBCB8B", // yellow / caution
  nord14: "#A3BE8C", // green / success
  nord15: "#B48EAD", // purple / special
};

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Direct Nord palette access
        nord: nord,

        // Semantic color mapping (dark-first — Nord is inherently a dark theme)
        background: {
          DEFAULT: nord.nord0,
          secondary: nord.nord1,
          tertiary: nord.nord2,
          elevated: nord.nord3,
        },
        surface: {
          DEFAULT: nord.nord1,
          2: nord.nord2,
          3: nord.nord3,
        },
        text: {
          DEFAULT: nord.nord6,
          secondary: nord.nord5,
          muted: nord.nord4,
          faint: nord.nord13,
          inverse: nord.nord0,
        },
        border: {
          DEFAULT: nord.nord2,
          subtle: nord.nord1,
          strong: nord.nord3,
        },
        accent: {
          DEFAULT: nord.nord8,
          frost: nord.nord7,
          blue: nord.nord9,
          deepblue: nord.nord10,
        },
        // Semantic roles
        primary: {
          DEFAULT: nord.nord8,
          hover: nord.nord7,
          active: nord.nord9,
          muted: "#3D6E77", // softer frost for subtle accents
        },
        success: {
          DEFAULT: nord.nord14,
          muted: "#3D5A3B",
        },
        warning: {
          DEFAULT: nord.nord13,
          muted: "#5A4E30",
        },
        error: {
          DEFAULT: nord.nord11,
          muted: "#5A373A",
        },
        special: {
          DEFAULT: nord.nord15,
          muted: "#4E3E55",
        },
        priority: {
          urgent: nord.nord11,
          high: nord.nord12,
          medium: nord.nord13,
          low: nord.nord9,
          none: nord.nord3,
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },

      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
      },

      spacing: {
        0.5: "0.125rem",
        1: "0.25rem",
        1.5: "0.375rem",
        2: "0.5rem",
        2.5: "0.625rem",
        3: "0.75rem",
        3.5: "0.875rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
        11: "2.75rem",
        12: "3rem",
        14: "3.5rem",
        16: "4rem",
        18: "4.5rem",
        20: "5rem",
        24: "6rem",
        sidebar: "14rem",
        "sidebar-collapsed": "3.5rem",
      },

      borderRadius: {
        none: "0",
        sm: "0.1875rem",
        DEFAULT: "0.375rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },

      boxShadow: {
        // Nord-tinted shadows
        sm: "0 1px 2px rgba(46,52,64,0.4)",
        DEFAULT: "0 2px 8px rgba(46,52,64,0.5)",
        md: "0 4px 16px rgba(46,52,64,0.55)",
        lg: "0 8px 32px rgba(46,52,64,0.65)",
        xl: "0 16px 48px rgba(46,52,64,0.7)",
        // Focus ring
        focus: `0 0 0 2px ${nord.nord8}`,
        "focus-error": `0 0 0 2px ${nord.nord11}`,
        // Task card
        task: "0 1px 4px rgba(46,52,64,0.5), 0 0 0 1px rgba(76,86,106,0.3)",
        "task-hover":
          "0 2px 8px rgba(46,52,64,0.6), 0 0 0 1px rgba(136,192,208,0.25)",
        // Command palette
        palette:
          "0 20px 60px rgba(46,52,64,0.8), 0 0 0 1px rgba(76,86,106,0.4)",
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring-in": "cubic-bezier(0.4, 0, 1, 1)",
        "spring-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      transitionDuration: {
        "75": "75ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "350": "350ms",
        "400": "400ms",
        "500": "500ms",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "task-complete": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        "check-draw": {
          from: { strokeDashoffset: "24" },
          to: { strokeDashoffset: "0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "50%": { transform: "scale(1.1)", opacity: "0.4" },
          "100%": { transform: "scale(0.9)", opacity: "0.8" },
        },
      },

      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "task-complete": "task-complete 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        "check-draw": "check-draw 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
      },

      zIndex: {
        sidebar: "10",
        topbar: "20",
        modal: "50",
        palette: "60",
        toast: "70",
        tooltip: "80",
      },

      width: {
        sidebar: "14rem",
        "sidebar-collapsed": "3.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
