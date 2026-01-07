import { useState, useEffect } from 'react';
import type { Service, Pet, Appointment, CreatePet, CreateAppointment, AppointmentWithDetails } from '@/shared/types';

const API_BASE = '/api';

// Generic fetch function with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Services hook
export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchApi<Service[]>('/services');
        setServices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return { services, loading, error };
}

// Pets hook
export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchApi<Pet[]>('/pets');
        setPets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pets');
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  const createPet = async (petData: CreatePet) => {
    try {
      const newPet = await fetchApi<Pet>('/pets', {
        method: 'POST',
        body: JSON.stringify(petData),
      });
      setPets(prev => [...prev, newPet]);
      return newPet;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create pet');
    }
  };

  return { pets, loading, error, createPet, refetch: () => window.location.reload() };
}

// Appointments hook
export function useAppointments(date?: string) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);
        const query = date ? `?date=${date}` : '';
        const data = await fetchApi<AppointmentWithDetails[]>(`/appointments${query}`);
        setAppointments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [date]);

  const createAppointment = async (appointmentData: CreateAppointment) => {
    try {
      const newAppointment = await fetchApi<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData),
      });
      // Refresh appointments
      window.location.reload();
      return newAppointment;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create appointment');
    }
  };

  const updateAppointmentStatus = async (id: number, status: string) => {
    try {
      await fetchApi(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === id ? { ...apt, status: status as any } : apt
        )
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update appointment status');
    }
  };

  return { 
    appointments, 
    loading, 
    error, 
    createAppointment, 
    updateAppointmentStatus,
    refetch: () => window.location.reload()
  };
}

// Available time slots hook
export function useAvailableSlots(date: string, duration: number = 60) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !duration) return;

    const fetchSlots = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchApi<{ slots: string[] }>(`/available-slots?date=${date}&duration=${duration}`);
        setSlots(data.slots || []);
      } catch (err) {
        console.error("Error fetching available slots:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch available slots');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, duration]);

  return { slots, loading, error };
}
