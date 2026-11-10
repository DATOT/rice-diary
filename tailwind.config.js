import * as daisyui from "daisyui";
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // For Next.js App Router
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // For Next.js Pages Router
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // If using a src directory
  ],
  theme: {
    extend: {},
  },
  plugins: [
    daisyui, // Make sure daisyui is registered here!
  ],
};
