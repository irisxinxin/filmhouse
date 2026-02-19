export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  points: number;
  membership?: Membership;
}

export interface Membership {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
}

export interface Film {
  id: number;
  title: string;
  slug: string;
  year: number;
  duration: number;
  rating: string;
  genre: string;
  synopsis: string;
  director: string;
  cast: string;
  language: string;
  subtitles: string;
  poster_url: string;
  banner_url: string;
  trailer_url: string;
  awards: string;
  is_4k: boolean;
  is_featured: boolean;
  is_active: boolean;
}

export interface Hall {
  id: number;
  name: string;
  capacity: number;
  is_4k: boolean;
  seat_layout?: string;
  seats?: Seat[];
}

// Seat layout types for the visual editor
export interface SeatLayoutCell {
  type: 'seat' | 'aisle' | 'empty';
  number?: number;
  seat_type?: string;
  disabled?: boolean;
}

export interface SeatLayoutRow {
  label: string;
  seats: SeatLayoutCell[];
}

export interface SeatLayout {
  rows: SeatLayoutRow[];
}

export interface Seat {
  id: number;
  hall_id: number;
  row: string;
  number: number;
  seat_type: string;
  is_active: boolean;
  status?: 'available' | 'booked' | 'locked' | 'selected' | 'in_cart';
}

export interface SeatWithStatus extends Seat {
  status: 'available' | 'booked' | 'locked' | 'selected' | 'in_cart';
}

export interface Screening {
  id: number;
  film_id: number;
  hall_id: number;
  start_time: string;
  end_time: string;
  price: number;
  is_active: boolean;
  film?: Film;
  hall?: Hall;
}

export interface Booking {
  id: number;
  booking_ref: string;
  qr_code: string;
  user_id: number;
  screening_id: number;
  total_amount: number;
  discount: number;
  final_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  redeem_status: 'unused' | 'redeemed';
  redeemed_at?: string;
  redeemed_by?: number;
  payment_method: string;
  payment_ref: string;
  points_earned: number;
  points_used: number;
  email_sent: boolean;
  email_sent_at?: string;
  created_at: string;
  tickets?: Ticket[];
  screening?: Screening;
  user?: User;
}

export interface Ticket {
  id: number;
  booking_id: number;
  seat_id: number;
  price: number;
  seat?: Seat;
}

export interface FilmWithScreenings {
  film: Film;
  screenings: Screening[];
}

export interface SeatWithStatus extends Seat {
  status: 'available' | 'booked' | 'locked' | 'selected' | 'in_cart';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Program {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  films?: Film[];
}
