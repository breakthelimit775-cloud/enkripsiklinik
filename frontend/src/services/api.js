import axios from 'axios';

// Vite proxy meneruskan /api/* → http://localhost:8000/api/*
// Jadi kita set baseURL ke '' dan gunakan path lengkap /api/xxx.php
const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// -- AUTH --
export const login = (data) => api.post('/api/auth.php?action=login', data);
export const logout = () => api.post('/api/auth.php?action=logout');
export const getMe = () => api.get('/api/auth.php?action=me');

// -- DASHBOARD --
export const getDashboardStats = () => api.get('/api/dashboard.php');

// -- PASIEN --
export const getPasiens = () => api.get('/api/pasien.php');
export const getPasienById = (id) => api.get(`/api/pasien.php?id=${id}`);
export const createPasien = (data) => api.post('/api/pasien.php', data);
export const updatePasien = (id, data) => api.put(`/api/pasien.php?id=${id}`, data);
export const deletePasien = (id) => api.delete(`/api/pasien.php?id=${id}`);

// -- DOKTER --
export const getDokters = () => api.get('/api/dokter.php');
export const createDokter = (data) => api.post('/api/dokter.php', data);
export const deleteDokter = (id) => api.delete(`/api/dokter.php?id=${id}`);

// -- REKAM MEDIS --
export const getRekamMedis = () => api.get('/api/rekam_medis.php');
export const getRekamMedisById = (id) => api.get(`/api/rekam_medis.php?id=${id}`);
export const createRekamMedis = (data) => api.post('/api/rekam_medis.php', data);
export const deleteRekamMedis = (id) => api.delete(`/api/rekam_medis.php?id=${id}`);

export default api;
