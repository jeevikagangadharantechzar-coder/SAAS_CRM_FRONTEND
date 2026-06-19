// module.exports = {
//    darkMode: 'class',
//     content: [
//       "./pages/**/*.{js,ts,jsx,tsx}",
//       "./components/**/*.{js,ts,jsx,tsx}",
//       "./app/**/*.{js,ts,jsx,tsx}",
//     ],
//     theme: {
//       extend: { fontFamily: {
//       poppins: ['Poppins', 'sans-serif'],
//     },},
//     },
//     plugins: [],
//   };
  

// // tailwind.config.js



/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    './src/**/*.{js,jsx}',
  ],
theme: {
      extend: { fontFamily: {
      poppins: ['Poppins', 'sans-serif'],
    },},
    },
    plugins: [],

  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
          // Robot animations
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "arm-wave-left": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(-20deg)" },
        },
        "arm-wave-right": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(20deg)" },
        },
        "trail": {
          "0%": { opacity: "0", transform: "translateX(0)" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateX(-4px)" },
        },
        // Optional: Add bounce animations for more robot movements
        "robot-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "robot-pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
         // Robot animations
        "spin-slow": "spin-slow 8s linear infinite",
        "arm-wave-left": "arm-wave-left 2s ease-in-out infinite",
        "arm-wave-right": "arm-wave-right 2s ease-in-out infinite",
        "trail": "trail 1s ease-in-out infinite",
        "robot-bounce": "robot-bounce 3s ease-in-out infinite",
        "robot-pulse-soft": "robot-pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}