
/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  importScripts: ['/firebase-messaging-sw.js'], // This is the new, correct line
});

const nextConfig = {
  turbopack: {},
};

module.exports = withPWA(nextConfig);
