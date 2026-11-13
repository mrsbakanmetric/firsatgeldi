"use client";

// TanStack Query hooks over the typed client (architecture.md §3, §21.3).
// Screens call these; they do not know whether the mock or the real API answers.
import {
  type ApiError,
  type ApiResponse,
  type CallInput,
  type EndpointData,
  type JsonEndpointName,
  type Me,
} from "@firsatgeldi/contracts";
import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { useApiClient } from "./provider";

/** Query key of an endpoint call: name + input, so equal calls share the cache. */
export function apiQueryKey<N extends JsonEndpointName>(name: N, input?: CallInput<N>) {
  return input === undefined ? ([name] as const) : ([name, input] as const);
}

export function useApiQuery<N extends JsonEndpointName>(
  name: N,
  input: CallInput<N>,
  options: Omit<UseQueryOptions<ApiResponse<EndpointData<N>>, ApiError>, "queryKey" | "queryFn"> = {},
) {
  const client = useApiClient();
  return useQuery<ApiResponse<EndpointData<N>>, ApiError>({
    queryKey: apiQueryKey(name, input),
    queryFn: ({ signal }) => client.call(name, { ...input, signal }),
    ...options,
  });
}

export function useApiMutation<N extends JsonEndpointName>(
  name: N,
  options: Omit<UseMutationOptions<ApiResponse<EndpointData<N>>, ApiError, CallInput<N>>, "mutationFn"> = {},
) {
  const client = useApiClient();
  return useMutation<ApiResponse<EndpointData<N>>, ApiError, CallInput<N>>({
    mutationFn: (input) => client.call(name, input),
    ...options,
  });
}

/**
 * The signed-in user, or null for a guest (`GET /me` answers UNAUTHENTICATED).
 * Use `permissions` to show or hide actions the way the server checks them.
 */
export function useSession(): { status: "loading" | "error"; me: undefined } | { status: "ready"; me: Me | null } {
  const query = useApiQuery("getMe", {}, { retry: false, staleTime: Number.POSITIVE_INFINITY });
  if (query.isPending) return { status: "loading", me: undefined };
  if (query.isError) return query.error.body.code === "UNAUTHENTICATED" ? { status: "ready", me: null } : { status: "error", me: undefined };
  return { status: "ready", me: query.data.data };
}
