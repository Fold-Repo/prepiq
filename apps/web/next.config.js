/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@exam-ai/shared', '@exam-ai/validation'],
  reactStrictMode: true,
};

module.exports = nextConfig;
