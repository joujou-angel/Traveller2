/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cream: '#FFFBF0',
                macaron: {
                    pink: '#FFB7B2',
                    blue: '#B2EBF2',
                    green: '#E2F0CB',
                },
                text: {
                    muted: '#6D6875'
                }
            }
        },
    },
    plugins: [],
}
