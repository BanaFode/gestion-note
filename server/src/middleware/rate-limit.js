const buckets = new Map();
let requestsSinceCleanup = 0;

const rateLimit = ({ limit, windowMs, keyPrefix }) => (req, res, next) => {
   const now = Date.now();
   const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
   let bucket = buckets.get(key);
   if (!bucket || bucket.expiresAt <= now) {
      bucket = { count: 0, expiresAt: now + windowMs };
   }
   bucket.count += 1;
   buckets.set(key, bucket);

   requestsSinceCleanup += 1;
   if (requestsSinceCleanup >= 256) {
      requestsSinceCleanup = 0;
      for (const [bucketKey, value] of buckets) {
         if (value.expiresAt <= now) buckets.delete(bucketKey);
      }
   }

   if (bucket.count > limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000))));
      return res.status(429).json({
         success: false,
         message: 'Trop de tentatives. Réessayez plus tard.',
         errors: [],
      });
   }

   return next();
};

export default rateLimit;
