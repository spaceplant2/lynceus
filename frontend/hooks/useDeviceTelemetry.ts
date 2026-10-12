// frontend/hooks/useDeviceTelemetry.ts
import { useEffect, useState, useRef, useCallback } from 'react';

export interface TelemetryMetrics {
  device_id: string;
  status: string;
  battery_charge_percent?: number;
  battery_runtime_minutes?: number;
  input_voltage?: number;
  output_voltage?: number;
  output_load_percent?: number;
  output_power_watts?: number;
  temperature_celsius?: number;
  timestamp?: string;
}

export interface DeviceTelemetryResponse {
  device_id: string;
  name: string;
  device_type: string;
  protocol: string;
  status: string;
  is_reachable: boolean;
  last_polled?: string;
  metrics: TelemetryMetrics;
  outlets?: any[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Exponential backoff configuration constants
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000;   // 30 seconds
const BACKOFF_FACTOR = 2;

export function useDeviceTelemetry() {
  const [devices, setDevices] = useState<DeviceTelemetryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Use refs to track retry attempt counts across effect closures without triggering re-runs
  const retryAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Initial REST Fetch
  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch(`${API_BASE}/api/devices`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data: DeviceTelemetryResponse[] = await res.json();
        setDevices(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch initial telemetry data');
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, []);

  // 2. Server-Sent Events (SSE) Stream Listener with Exponential Backoff
  const connectStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE}/api/devices/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      // Reset backoff counter upon successful connection
      retryAttemptRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const updatedDevice: DeviceTelemetryResponse = JSON.parse(event.data);
        setDevices((prevDevices) => {
          const index = prevDevices.findIndex(
            (d) => d.device_id === updatedDevice.device_id
          );
          if (index !== -1) {
            const newDevices = [...prevDevices];
            newDevices[index] = updatedDevice;
            return newDevices;
          }
          return [...prevDevices, updatedDevice];
        });
      } catch (err) {
        console.error('Error parsing SSE payload:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE Stream connection lost. Attempting reconnection...', err);
      setIsConnected(false);
      eventSource.close();

      // Calculate exponential delay: initial * (factor ^ attempt) + random jitter (0-1000ms)
      const attempt = retryAttemptRef.current;
      const baseDelay = Math.min(
        MAX_RETRY_DELAY,
        INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, attempt)
      );
      const jitter = Math.random() * 1000;
      const totalDelay = baseDelay + jitter;

      retryAttemptRef.current += 1;

      // Schedule reconnection attempt
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectStream();
      }, totalDelay);
    };
  }, []);

  useEffect(() => {
    connectStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectStream]);

  return { devices, loading, error, isConnected };
}