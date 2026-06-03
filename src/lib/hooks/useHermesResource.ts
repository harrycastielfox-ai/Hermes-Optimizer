import { useEffect, useState } from "react";
import type { HermesApiResult } from "../tauri";

type ResourceState<T> = {
  data?: T;
  loading: boolean;
  error?: string;
  fallback: boolean;
};

export function useHermesResource<T>(loader: () => Promise<HermesApiResult<T>>) {
  const [state, setState] = useState<ResourceState<T>>({ loading: true, fallback: false });

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true }));

    loader()
      .then((result) => {
        if (!alive) return;
        setState({ data: result.data, error: result.error, fallback: result.fallback, loading: false });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setState({
          loading: false,
          fallback: false,
          error: error instanceof Error ? error.message : "Falha inesperada ao carregar dados do Hermes.",
        });
      });

    return () => {
      alive = false;
    };
  }, [loader]);

  return state;
}
