/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker; Vercel manages its own output
  ...(process.env.VERCEL ? {} : { output: "standalone" }),

  // Prevent webpack from bundling native Node modules — required for Vercel
  // serverless functions where libsql ships platform-specific binaries.
  serverExternalPackages: ["libsql", "@libsql/client", "@prisma/adapter-libsql"],
};
export default nextConfig;
