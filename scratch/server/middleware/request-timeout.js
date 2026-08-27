export function createRequestTimeoutMiddleware(timeoutMs, options = {}) {
  const safeTimeoutMs = Math.max(1000, Number(timeoutMs || 15000));
  const timeoutMessage = String(options.message || 'Request timed out.');

  return function requestTimeoutMiddleware(req, res, next) {
    let completed = false;
    const startedAt = Date.now();

    const timer = setTimeout(() => {
      if (completed || res.headersSent) return;
      completed = true;
      const durationMs = Date.now() - startedAt;
      return res.status(504).json({
        errorType: 'TIMEOUT',
        reason: timeoutMessage,
        durationMs,
        requestId: req?.requestId || null,
      });
    }, safeTimeoutMs);

    const cleanup = () => {
      completed = true;
      clearTimeout(timer);
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    return next();
  };
}

export default {
  createRequestTimeoutMiddleware,
};
