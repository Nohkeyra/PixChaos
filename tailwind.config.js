
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        highlight: 'var(--color-highlight)',
        surface: {
          deep: 'var(--color-surface-deep)',
          panel: 'var(--color-surface-panel)',
          grid: 'var(--color-surface-grid)',
          card: 'var(--color-surface-card)',
          elevated: 'var(--color-surface-elevated)',
          hover: 'var(--color-surface-hover)',
          border: 'var(--color-surface-border)',
          'border-light': 'var(--color-surface-border-light)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Koulen', 'sans-serif'],
        mono: ['Orbitron', 'monospace'],
        graffiti: ['"Rubik Wet Paint"', 'cursive'],
      },
      animation: {
        'spin-slow': 'spin-slow 3s linear infinite', 
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s infinite alternate',
        'sweep': 'sweep 3s linear infinite',
        'scanline': 'scanline 8s linear infinite', 
        'glitch-anim-1': 'glitch-anim-1 2s infinite linear alternate-reverse',
        'glitch-anim-2': 'glitch-anim-2 3s infinite linear alternate-reverse',
        'shimmer': 'shimmer 1s infinite',
        'scan-sweep-vertical': 'scan-sweep-vertical 2s linear infinite',
        'height-jitter': 'height-jitter 0.5s infinite',
        'h-glitch-before': 'h-glitch-before 0.5s infinite',
        'h-glitch-after': 'h-glitch-after 0.5s infinite',
        'grid-move': 'grid-move 2s linear infinite', 
      },
      keyframes: {
        'spin-slow': { 
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: { 
          '0%': { boxShadow: '0 0 5px rgba(248, 19, 13, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(248, 19, 13, 0.5)' }
        },
        'grid-move': { 
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 40px' }
        },
        sweep: { 
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        scanline: { 
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' }
        },
        'glitch-anim-1': { 
          '0%': { clip: 'rect(22px, 9999px, 92px, 0)' },
          '25%': { clip: 'rect(33px, 9999px, 76px, 0)' },
          '50%': { clip: 'rect(10px, 9999px, 80px, 0)' },
          '75%': { clip: 'rect(50px, 9999px, 60px, 0)' },
          '100%': { clip: 'rect(25px, 9999px, 75px, 0)' },
        },
        'glitch-anim-2': { 
          '0%': { clip: 'rect(85px, 9999px, 100px, 0)' },
          '25%': { clip: 'rect(45px, 9999px, 90px, 0)' },
          '50%': { clip: 'rect(65px, 9999px, 85px, 0)' },
          '75%': { clip: 'rect(15px, 9999px, 70px, 0)' },
          '100%': { clip: 'rect(95px, 9999px, 110px, 0)' },
        },
        shimmer: { 
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'scan-sweep-vertical': { 
          '0%': { top: '-10%', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.8' },
          '100%': { top: '110%', opacity: '0' },
        },
        'height-jitter': { 
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.5)' },
        },
        'h-glitch-before': { 
          '0%': { clip: 'rect(62px, 9999px, 72px, 0)', transform: 'skew(0.2deg)' },
          '25%': { clip: 'rect(38px, 9999px, 52px, 0)', transform: 'skew(0.5deg)' },
          '50%': { clip: 'rect(11px, 9999px, 22px, 0)', transform: 'skew(0.1deg)' },
          '75%': { clip: 'rect(78px, 9999px, 90px, 0)', transform: 'skew(0.8deg)' },
          '100%': { clip: 'rect(45px, 9999px, 58px, 0)', transform: 'skew(0.3deg)' },
        },
        'h-glitch-after': { 
          '0%': { clip: 'rect(85px, 9999px, 93px, 0)', transform: 'skew(-0.3deg)' },
          '25%': { clip: 'rect(25px, 9999px, 38px, 0)', transform: 'skew(-0.6deg)' },
          '50%': { clip: 'rect(50px, 9999px, 63px, 0)', transform: 'skew(-0.2deg)' },
          '75%': { clip: 'rect(18px, 9999px, 28px, 0)', transform: 'skew(-0.9deg)' },
          '100%': { clip: 'rect(70px, 9999px, 82px, 0)', transform: 'skew(-0.4deg)' },
        }
      }
    },
  },
  plugins: [],
}
