import { useQuery } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Booking, Business, Location, Service, Staff } from './types';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'services'));
      return snap.docs.map((d) => d.data() as Service);
    },
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'staff'));
      return snap.docs.map((d) => d.data() as Staff);
    },
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'locations'));
      return snap.docs.map((d) => d.data() as Location);
    },
  });
}

export function useBusiness() {
  return useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'business', 'main'));
      return (snap.exists() ? snap.data() : null) as Business | null;
    },
  });
}

export function useCustomerBookings(uid: string | undefined) {
  return useQuery({
    enabled: !!uid,
    queryKey: ['bookings', 'customer', uid],
    queryFn: async () => {
      if (!uid) return [];
      const q = query(collection(db, 'bookings'), where('customerUid', '==', uid), orderBy('startAt', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Booking);
    },
  });
}

export function useStaffBookings(staffId: string | undefined) {
  return useQuery({
    enabled: !!staffId,
    queryKey: ['bookings', 'staff', staffId],
    queryFn: async () => {
      if (!staffId) return [];
      const q = query(collection(db, 'bookings'), where('staffId', '==', staffId), orderBy('startAt', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Booking);
    },
  });
}

export function useAllBookings() {
  return useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'bookings'), orderBy('startAt', 'asc')));
      return snap.docs.map((d) => d.data() as Booking);
    },
  });
}
