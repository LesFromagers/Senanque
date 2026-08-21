import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Senanque already has a hand-authored CLAUDE.md; never let Next.js
  // generate its own AGENTS.md/CLAUDE.md stub alongside it.
  agentRules: false,
};

export default nextConfig;
