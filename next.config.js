/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Server-side env vars (not exposed to browser)
  serverRuntimeConfig: {
    brainApiUrl: process.env.BRAIN_API_URL || 'http://localhost:5001',
  },

  // Public env vars (exposed to browser via NEXT_PUBLIC_ prefix)
  publicRuntimeConfig: {
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'MedVision',
    appUrl:  process.env.NEXT_PUBLIC_APP_URL  || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
