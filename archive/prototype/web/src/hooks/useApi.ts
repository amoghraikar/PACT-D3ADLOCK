"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  pollInterval?: number;
}

export interface UseApiResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<T | null>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { immediate = true, onSuccess, onError, pollInterval } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(immediate);

  const isMountedRef = useRef(true);
  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFnRef.current();
      if (isMountedRef.current) {
        setData(result);
        setIsLoading(false);
        onSuccess?.(result);
      }
      return result;
    } catch (err: any) {
      const normalizedError = err instanceof Error ? err : new Error(String(err));
      if (isMountedRef.current) {
        setError(normalizedError);
        setIsLoading(false);
        onError?.(normalizedError);
      }
      return null;
    }
  }, [onError, onSuccess]);

  useEffect(() => {
    isMountedRef.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [execute, immediate, ...deps]);

  // Polling support
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;
    const interval = setInterval(() => {
      execute();
    }, pollInterval);
    return () => clearInterval(interval);
  }, [execute, pollInterval]);

  return { data, error, isLoading, refetch: execute, setData };
}
