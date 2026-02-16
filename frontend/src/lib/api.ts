import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Optionally redirect to login
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; first_name?: string; last_name?: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string }) =>
    api.put('/auth/profile', data),
};

// Films API
export const filmsApi = {
  list: (date?: string) => api.get('/films', { params: { date } }),
  getFeatured: () => api.get('/films/featured'),
  get: (id: string | number) => api.get(`/films/${id}`),
  getScreenings: (id: string | number, date?: string) =>
    api.get(`/films/${id}/screenings`, { params: { date } }),
};

// Screenings API
export const screeningsApi = {
  list: (params?: { date?: string; film_id?: number }) =>
    api.get('/screenings', { params }),
  get: (id: number) => api.get(`/screening/${id}`),
  getByDate: (date: string) => api.get(`/screenings/date/${date}`),
  getSeats: (screeningId: number) => api.get(`/screening/${screeningId}/seats`),
  getPrices: (screeningId: number) => api.get(`/screening/${screeningId}/prices`),
};

// Ticket Types API
export const ticketTypesApi = {
  list: () => api.get('/ticket-types'),
};

// Bookings API
export const bookingsApi = {
  list: () => api.get('/bookings'),
  get: (id: number) => api.get(`/bookings/${id}`),
  getByRef: (ref: string) => api.get(`/booking/ref/${ref}`),
  lockSeats: (screeningId: number, seatIds: number[]) =>
    api.post(`/bookings/screenings/${screeningId}/lock`, { seat_ids: seatIds }),
  guestLockSeats: (screeningId: number, seatIds: number[]) =>
    api.post(`/guest/lock/${screeningId}`, { seat_ids: seatIds }),
  releaseLocks: (screeningId: number) =>
    api.delete(`/bookings/screenings/${screeningId}/lock`),
  create: (screeningId: number, seatIds: number[], paymentMethod: string) =>
    api.post(`/bookings/screenings/${screeningId}`, { seat_ids: seatIds, payment_method: paymentMethod }),
  createGuestBooking: (
    screeningId: number, 
    tickets: { seat_id: number; ticket_type_id: number }[],
    paymentMethod: string,
    guestInfo?: { name: string; email: string; phone: string }
  ) =>
    api.post(`/bookings/guest/screenings/${screeningId}`, { 
      tickets,
      payment_method: paymentMethod,
      guest_name: guestInfo?.name,
      guest_email: guestInfo?.email,
      guest_phone: guestInfo?.phone,
    }),
  confirm: (bookingId: number, paymentRef: string) =>
    api.post(`/bookings/${bookingId}/confirm`, { payment_ref: paymentRef }),
  cancel: (bookingId: number) =>
    api.post(`/bookings/${bookingId}/cancel`),
};

// Halls API
export const hallsApi = {
  list: () => api.get('/halls'),
  get: (id: number) => api.get(`/halls/${id}`),
};

// Admin API
export const adminApi = {
  // Films
  listFilms: () => api.get('/admin/films'),
  createFilm: (data: Partial<Film>) => api.post('/admin/films', data),
  updateFilm: (id: number, data: Partial<Film>) => api.put(`/admin/films/${id}`, data),
  deleteFilm: (id: number) => api.delete(`/admin/films/${id}`),
  uploadPoster: (id: number, formData: FormData) => 
    api.post(`/admin/films/${id}/poster`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadBanner: (id: number, formData: FormData) =>
    api.post(`/admin/films/${id}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Screenings
  listScreenings: (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/admin/screenings', { params }),
  createScreening: (data: { film_id: number; hall_id: number; start_time: string; price: number }) =>
    api.post('/admin/screenings', data),
  updateScreening: (id: number, data: { price?: number; is_active?: boolean }) =>
    api.put(`/admin/screenings/${id}`, data),
  deleteScreening: (id: number) => api.delete(`/admin/screenings/${id}`),

  // Halls
  listHalls: () => api.get('/admin/halls'),
  createHall: (data: { name: string; capacity: number; is_4k?: boolean }) =>
    api.post('/admin/halls', data),
  updateHall: (id: number, data: Partial<Hall>) => api.put(`/admin/halls/${id}`, data),
  deleteHall: (id: number) => api.delete(`/admin/halls/${id}`),
  getSeats: (hallId: number) => api.get(`/admin/halls/${hallId}/seats`),
  bulkCreateSeats: (hallId: number, data: { rows: string[]; seats_per_row: number; aisles?: number[]; seat_type?: string }) =>
    api.post(`/admin/halls/${hallId}/seats/bulk`, data),
  toggleSeat: (hallId: number, seatId: number) =>
    api.post(`/admin/halls/${hallId}/seats/${seatId}/toggle`),
  bulkUpdateSeats: (data: { seat_ids: number[]; is_active?: boolean; seat_type?: string }) =>
    api.post('/admin/seats/bulk-update', data),

  // Bookings
  listBookings: (params?: { status?: string; screening_id?: number }) =>
    api.get('/admin/bookings', { params }),
  updateBookingStatus: (id: number, status: string) =>
    api.put(`/admin/bookings/${id}/status`, { status }),
};

import type { Film, Hall } from '@/types';
