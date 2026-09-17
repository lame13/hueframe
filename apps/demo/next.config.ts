import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next writes AGENTS.md/CLAUDE.md into the app on `next dev`. The repo keeps its
  // own docs (root README + package README), so that generator stays off.
  agentRules: false,
  // The demo consumes the workspace package's built output, so nothing needs to
  // be transpiled. Run `npm run build:package` (or `npm run dev` at the root) first.
  transpilePackages: ['hueframe'],
};

export default nextConfig;
