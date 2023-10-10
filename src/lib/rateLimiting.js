const FUNCTION_TIMEOUT_MS = 60000;
const RATE_LIMIT_ERROR_CODE = 429;

// We export a class so that it's easy to mock with sinon
export default class RateLimiting {
  // This function is used to add jitter to the function execution when a rate limit error is thrown
  static async jitterOnThrow(func) {
    const startTime = Date.now();

    try {
      await func();
    } catch (error) {
      if (error?.response?.status === RATE_LIMIT_ERROR_CODE) {
        console.error('Rate limit error. Adding random pause');
        await this.randomPause(startTime);
        throw error;
      }
    }
  }

  // Random pause within the window of half of the remaining available time before
  // hitting timeout.
  // https://platform.openai.com/docs/guides/rate-limits/error-mitigation
  static async randomPause(startTime) {
    const elapsedMs = Date.now() - startTime;
    const remainingMs = FUNCTION_TIMEOUT_MS - elapsedMs;
    const halfOfRemainingTime = remainingMs / 2;
    const jitterTimeoutMs = Math.random() * halfOfRemainingTime;

    await this.waitMillis(jitterTimeoutMs);
  }

  static async waitMillis(millis) {
    await new Promise((resolve) => setTimeout(resolve, millis));
  }
}
