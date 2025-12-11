/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                handwriting: ['Caveat', 'cursive'],
            },
            colors: {
                page: {
                    title: '#342b14',
                    bg: '#faf8f5',
                },
                main: {
                    title: '#5a4a42',
                },
                sub: {
                    title: '#a39992',
                },
                desc: '#667280',
                btn: {
                    DEFAULT: '#d4c4b8',
                    text: '#ffffff', // Assuming white text for buttons unless specified otherwise
                },
                date: {
                    unselected: {
                        bg: '#f5f0eb',
                        text: '#a39992',
                    },
                    selected: {
                        bg: '#ebe6e1',
                        text: '#5a4a42',
                    },
                },
                box: {
                    bg: '#faf8f5',
                    border: '#e8e3de',
                    inner: '#faf8f5',
                },
                positive: '#88b89e', // For positive numbers
                negative: '#d8a4a4', // For negative numbers
                bottom: {
                    unselected: {
                        text: '#a39992',
                        bg: '#ffffff',
                    },
                    selected: '#d4c4b8',
                },
                line: '#e8e3de',
            }
        },
    },
    plugins: [],
}
