/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        /* Brand — Deep verdant green, premium, fresh */
        brand: {
          DEFAULT: '#0E5C3A',
          dark: '#08402A',
          light: '#1F8B5C',
          glow: '#2DBC83',
          soft: '#E6F2EC',
          tint: '#F2F8F4',
        },

        /* Accents — Captivating, food-forward */
        coral: {
          DEFAULT: '#FF6B47',
          soft: '#FFE5DD',
        },
        honey: {
          DEFAULT: '#F4B942',
          soft: '#FDF1D9',
        },
        berry: {
          DEFAULT: '#C2185B',
          soft: '#FCE4EC',
        },
        sky: {
          DEFAULT: '#4A90E2',
          soft: '#E3F0FB',
        },
        plum: {
          DEFAULT: '#6B5B95',
          soft: '#EFEBF7',
        },

        /* Status — Vibrant + readable */
        fresh: {
          DEFAULT: '#1F9956',
          bg: '#E0F4E8',
        },
        soon: {
          DEFAULT: '#E08F1B',
          bg: '#FCEFD3',
        },
        urgent: {
          DEFAULT: '#E0392B',
          bg: '#FBE0DD',
        },
        expired: {
          DEFAULT: '#6B6B6B',
          bg: '#ECECEC',
        },

        /* Surface — Warm, premium feel */
        bg: {
          DEFAULT: '#FAF6EE',
          secondary: '#F4EEDD',
          raised: '#FFFFFF',
          sunken: '#F5F1E5',
        },
        overlay: 'rgba(15,28,17,0.45)',

        /* Text */
        t1: '#0F1A11',
        t2: '#4D5A4F',
        t3: '#7B8580',
        't-inv': '#FFFFFF',

        /* Border */
        b1: '#E8E0CC',
        b2: '#D6CDB6',
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },

      fontSize: {
        'h1': ['34px', { lineHeight: '1.05', letterSpacing: '-1.2px', fontWeight: '800' }],
        'h2': ['28px', { lineHeight: '1.1', letterSpacing: '-0.8px', fontWeight: '800' }],
        'h3': ['22px', { lineHeight: '1.15', letterSpacing: '-0.4px', fontWeight: '700' }],
        'h4': ['18px', { lineHeight: '1.3', letterSpacing: '-0.2px', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '1.45', color: 'var(--t1)' }],
        'body-sm': ['14px', { lineHeight: '1.4', color: 'var(--t2)' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.3px' }],
        'eyebrow': ['11px', { fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase' }],
      },

      borderRadius: {
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '22px',
        'xl': '32px',
        'full': '9999px',
      },

      boxShadow: {
        's-1': '0 1px 2px rgba(15,26,17,0.04), 0 2px 6px rgba(15,26,17,0.04)',
        's-2': '0 2px 4px rgba(15,26,17,0.04), 0 8px 20px rgba(15,26,17,0.07)',
        's-3': '0 8px 16px rgba(15,26,17,0.06), 0 20px 40px rgba(15,26,17,0.10)',
        's-glow': '0 8px 32px rgba(14,92,58,0.25)',
        's-coral': '0 8px 24px rgba(255,107,71,0.30)',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34,1.56,0.64,1)',
        'ease': 'cubic-bezier(0.16,1,0.3,1)',
        'quick': 'cubic-bezier(0.4,0,0.2,1)',
      },

      animation: {
        'spring': 'spring 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
