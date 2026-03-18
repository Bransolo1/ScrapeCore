/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Electron/Docker; Vercel manages its own output
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};
export default nextConfig;
