export type Role = 'customer' | 'staff' | 'admin';

export interface UserDoc {
  uid: string;
  email: string;
  name: string;
  role: Role;
  staffId?: string; // if role === 'staff', references staff doc
  createdAt: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  color: string; // tailwind color token name
  staffIds: string[]; // staff who can perform this service
}

export interface Staff {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  locationId: string;
  // weekly availability — array indexed by day of week (0 = Sun)
  availability: { dow: number; startMin: number; endMin: number }[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
}

export type BookingStatus = 'confirmed' | 'completed' | 'canceled' | 'no_show';

export interface Booking {
  id: string;
  serviceId: string;
  staffId: string;
  locationId: string;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  startAt: number; // ms
  endAt: number; // ms
  status: BookingStatus;
  notes?: string;
  createdAt: number;
  priceCents: number;
}

export interface Business {
  id: string;
  name: string;
  tagline: string;
  niche: 'salon' | 'dental' | 'fitness';
}
