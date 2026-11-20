import api from './client';

export const login = (telephone: string, password: string) => {
  return api.post('/api/akkarak/auth/login', { telephone, password });
};

export const register = (data: {
  telephone: string;
  password: string;
  nom: string;
  prenom: string;
}) => {
  return api.post('/api/akkarak/auth/register', data);
};

export const verifyOtp = (telephone: string, otp: string) => {
  return api.post('/api/akkarak/auth/verify-otp', { telephone, code: otp });
};

