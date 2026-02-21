/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'comic': ['Bangers', 'cursive'],
            },
            colors: {
                'comic-yellow': '#FFD700',
                'comic-blue': '#00BFFF',
            },
            animation: {
                'shimmer': 'shimmer 2s linear infinite',
                'bounce-slow': 'bounce 3s infinite',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                }
            }
        },
    },
    plugins: [],
}
