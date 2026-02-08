import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { ProcessingStatusWithHITL } from '../types';

interface UseHITLPollingOptions {
  threadId: string | null;
  enabled?: boolean;
  interval?: number;
  /** When true, poll GET /api/process/result/{threadId} (artifacts-service) instead of GET /state/{threadId} (core). Use after 202 from POST /api/process. */
  useProcessResult?: boolean;
  onInterrupt?: (status: ProcessingStatusWithHITL) => void;
  onComplete?: (status: ProcessingStatusWithHITL) => void;
  onError?: (error: Error) => void;
}

interface UseHITLPollingResult {
  status: ProcessingStatusWithHITL | null;
  isPolling: boolean;
  error: Error | null;
  startPolling: () => void;
  stopPolling: () => void;
  refreshStatus: () => Promise<void>;
}

export const useHITLPolling = ({
  threadId,
  enabled = true,
  interval = 3000,
  useProcessResult = false,
  onInterrupt,
  onComplete,
  onError,
}: UseHITLPollingOptions): UseHITLPollingResult => {
  const [status, setStatus] = useState<ProcessingStatusWithHITL | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const previousStatusRef = useRef<string | undefined>(undefined);
  const isPollingRef = useRef(false);

  // Store callbacks in refs to avoid re-creating fetchStatus/startPolling on every render
  const onInterruptRef = useRef(onInterrupt);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => { onInterruptRef.current = onInterrupt; }, [onInterrupt]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    setIsPolling(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!threadId || !isMountedRef.current) return;

    try {
      if (useProcessResult) {
        const { status: resStatus, data } = await api.getProcessResult(threadId);
        if (!isMountedRef.current) return;

        // Still pending — keep polling
        if (resStatus === 202 || (resStatus === 200 && data?.status === 'pending')) {
          setStatus({
            threadId,
            sessionId: '',
            status: 'processing',
            interrupted: false,
            awaiting_feedback: false,
          });
          setError(null);
          previousStatusRef.current = 'processing';
          return;
        }

        // Error from backend
        if (resStatus === 200 && data && 'error' in data && data.error != null) {
          stopPolling();
          const err = new Error(String(data.error));
          setError(err);
          onErrorRef.current?.(err);
          return;
        }

        // Got a result
        if (resStatus === 200 && data) {
          const newStatus = api.mapProcessResultToStatus(data as Record<string, unknown>);
          setStatus(newStatus);
          setError(null);
          previousStatusRef.current = newStatus.status;

          if (newStatus.status === 'failed') {
            stopPolling();
            onErrorRef.current?.(new Error(newStatus.error || 'Processing failed'));
            return;
          }
          if (newStatus.interrupted && newStatus.awaiting_feedback) {
            stopPolling();
            onInterruptRef.current?.(newStatus);
            return;
          }
          if (newStatus.status === 'completed') {
            stopPolling();
            onCompleteRef.current?.(newStatus);
          }
          return;
        }
      }

      // Fallback: poll getThreadState (core)
      const newStatus = await api.getThreadState(threadId);
      if (!isMountedRef.current) return;

      setStatus(newStatus);
      setError(null);

      if (newStatus.interrupted && newStatus.awaiting_feedback) {
        stopPolling();
        onInterruptRef.current?.(newStatus);
      } 
      else if (newStatus.status === 'completed' && previousStatusRef.current !== 'completed') {
        stopPolling();
        onCompleteRef.current?.(newStatus);
      }
      else if (newStatus.status === 'failed') {
        stopPolling();
        const err = new Error(newStatus.error || 'Processing failed with error');
        setError(err);
        onErrorRef.current?.(err);
      }

      previousStatusRef.current = newStatus.status;
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error(err.message || 'Error getting status');
      setError(error);
      onErrorRef.current?.(error);
      stopPolling();
    }
  }, [threadId, useProcessResult, stopPolling]);

  const startPolling = useCallback(() => {
    if (!threadId || isPollingRef.current) return;

    isPollingRef.current = true;
    setIsPolling(true);
    setError(null);
    previousStatusRef.current = undefined;

    fetchStatus();

    intervalRef.current = setInterval(fetchStatus, interval);
  }, [threadId, fetchStatus, interval]);

  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // Auto-start when enabled + threadId are set
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && threadId && !isPollingRef.current) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [enabled, threadId, startPolling, stopPolling]);

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refreshStatus,
  };
};
