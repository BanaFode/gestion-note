const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiRequest = async (
   path,
   { token, method = 'GET', body } = {}
) => {
   console.log(
      'API Request actuel:',
      method,
      path,
      body ? `Body: ${JSON.stringify(body)}` : ''
   );
   const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
         ...(body ? { 'Content-Type': 'application/json' } : {}),
         ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
   });
   console.log("Réponse de l'API:", response.status, response);
   const payload = await response.json().catch(() => ({}));
   if (!response.ok) {
      const details = Array.isArray(payload.errors)
         ? payload.errors.filter(
              (message) => typeof message === 'string' && message.trim()
           )
         : [];
      const message = [payload.message, ...details]
         .filter((part) => typeof part === 'string' && part.trim())
         .filter((part, index, messages) => messages.indexOf(part) === index)
         .join(' ');
      throw new Error(message || 'La requête a échoué.');
   }

   return payload.data;
};

export const login = (credentials) =>
   apiRequest('/auth/login', { method: 'POST', body: credentials });

export const requestPasswordReset = (email) =>
   apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });

export const resetPassword = (token, newPassword) =>
   apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
   });

export const updatePassword = (token, currentPassword, newPassword) =>
   apiRequest('/auth/change-password', {
      token,
      method: 'POST',
      body: { currentPassword, newPassword },
   });
