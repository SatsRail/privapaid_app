import "@testing-library/jest-dom/vitest";

// Test environment variables
process.env.SK_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.MONGODB_URI = "will-be-overridden-by-memory-server";
process.env.AUTH_SECRET = "test-auth-secret-at-least-32-characters-long";
process.env.NEXTAUTH_SECRET = "test-auth-secret-at-least-32-characters-long";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.SATSRAIL_WEBHOOK_SECRET = "test-webhook-secret";
process.env.SATSRAIL_API_URL = "https://satsrail.com/api/v1";
