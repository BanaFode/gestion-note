export const isAllowedClientOrigin = (
   origin,
   configuredOrigin,
   nodeEnv = 'development'
) => {
   if (!origin || origin === configuredOrigin) return true;
   if (nodeEnv !== 'development') return false;

   let parsedOrigin;
   try {
      parsedOrigin = new URL(origin);
   } catch {
      return false;
   }

   const port = Number(parsedOrigin.port);
   return (
      parsedOrigin.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname) &&
      port >= 5173 &&
      port <= 5199
   );
};
