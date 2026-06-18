import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/react-app/lib/apiClient';
import type { AppointmentWithDetails } from '@/shared/types';

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Dois bipes curtos
    [0, 0.25].forEach((offset) => {
      osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
    });
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext indisponível
  }
}

export function useAppointmentNotification(isLoggedIn: boolean) {
  const knownIds = useRef<Set<number>>(new Set());
  const initialized = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
  }, []);

  const poll = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await api.get<AppointmentWithDetails[]>('/appointments');

      if (!initialized.current) {
        initialized.current = true;
        knownIds.current = new Set(data.map((a) => a.id));
        return;
      }

      const novos = data.filter(
        (a) => !knownIds.current.has(a.id) && a.status === 'agendado'
      );

      knownIds.current = new Set(data.map((a) => a.id));

      if (novos.length === 0) return;

      playBeep();

      if (permission === 'granted') {
        const primeiro = novos[0];
        new Notification(`Novo agendamento! (${novos.length})`, {
          body: `${primeiro.owner_name} — ${primeiro.appointment_time}`,
          icon: '/logo.png',
          tag: 'new-appointment',
        });
      }
    } catch {
      // Silencioso — não interrompe o fluxo do profissional
    }
  }, [isLoggedIn, permission]);

  useEffect(() => {
    if (!isLoggedIn) return;
    poll(); // Carga inicial para preencher knownIds
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [isLoggedIn, poll]);

  return { permission, requestPermission };
}
