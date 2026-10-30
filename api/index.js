// Vercel turns every file in /api into a serverless function.
// vercel.json routes all /api/* requests here. The real code lives in
// server/src/vercel.js so it can use the server's installed packages.
export { default } from '../server/src/vercel.js';
