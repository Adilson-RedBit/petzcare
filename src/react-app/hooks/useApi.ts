import { useCallback, useEffect, useState } from "react";
import type {
  Service,
  Pet,
  CreatePet,
  CreateAppointment,
  Appointment,
  AppointmentWithDetails,
} from "@/shared/types";
import { api } from "@/react-app/lib/apiClient";

// =============================================================
// Services
// =============================================================
export function useServices(petId?: number) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const path = petId ? `/services?pet_id=${petId}` : "/services";
      const data = await api.get<Service[]>(path);
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar serviços");
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
}

// =============================================================
// Pets
// =============================================================
export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Pet[]>("/pets");
      setPets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar pets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const createPet = useCallback(async (petData: CreatePet) => {
    const newPet = await api.post<Pet>("/pets", petData);
    setPets((prev) => [...prev, newPet]);
    return newPet;
  }, []);

  return { pets, loading, error, createPet, refetch: fetchPets };
}

// =============================================================
// Appointments
// =============================================================
export function useAppointments(date?: string) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = date ? `?date=${date}` : "";
      const data = await api.get<AppointmentWithDetails[]>(
        `/appointments${query}`
      );
      setAppointments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao buscar agendamentos"
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = useCallback(
    async (data: CreateAppointment) => {
      const created = await api.post<Appointment>("/appointments", data);
      await fetchAppointments();
      return created;
    },
    [fetchAppointments]
  );

  const updateAppointmentStatus = useCallback(
    async (id: number, status: string) => {
      await api.patch(`/appointments/${id}/status`, { status });
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === id ? { ...apt, status: status as any } : apt
        )
      );
    },
    []
  );

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointmentStatus,
    refetch: fetchAppointments,
  };
}

// =============================================================
// Available time slots
// =============================================================
export function useAvailableSlots(date: string) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    const fetchSlots = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<string[]>(
          `/available-slots?date=${date}`
        );
        if (!cancelled) setSlots(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Falha ao buscar horários"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return { slots, loading, error };
}
