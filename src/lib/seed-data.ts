// Static demo accounts list — used by Login one-click tiles and seed script.
import type { Role } from './types';

export interface SeedUser {
  uid: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  staffId?: string;
}

export const SEED_USERS: SeedUser[] = [
  {
    uid: 'user-customer-1',
    email: 'maya@booklypro.demo',
    password: 'demo1234',
    name: 'Maya Goldberg',
    role: 'customer',
  },
  {
    uid: 'user-customer-2',
    email: 'theo@booklypro.demo',
    password: 'demo1234',
    name: 'Theo Park',
    role: 'customer',
  },
  {
    uid: 'user-staff-1',
    email: 'jordan@booklypro.demo',
    password: 'demo1234',
    name: 'Jordan Rivera',
    role: 'staff',
    staffId: 'staff-jordan',
  },
  {
    uid: 'user-staff-2',
    email: 'priya@booklypro.demo',
    password: 'demo1234',
    name: 'Priya Vasudevan',
    role: 'staff',
    staffId: 'staff-priya',
  },
  {
    uid: 'user-admin-1',
    email: 'admin@booklypro.demo',
    password: 'demo1234',
    name: 'Sage Thompson',
    role: 'admin',
  },
];

// Tiles shown on Login page (one per role).
export const DEMO_TILES = [
  { uid: 'user-customer-1', label: 'Customer', sub: 'Book a service' },
  { uid: 'user-staff-1', label: 'Staff', sub: 'See your day' },
  { uid: 'user-admin-1', label: 'Admin', sub: 'Manage the studio' },
];
