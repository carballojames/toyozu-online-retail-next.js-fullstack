import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ApprovedAddressRow = {
  id: number;
  street: string;
  is_active: boolean;
  created_at: string;
  barangay: {
    id: number;
    name: string;
    municipality: {
      id: number;
      name: string;
      province: {
        id: number;
        name: string;
        region: { id: number; name: string } | null;
      } | null;
    } | null;
  };
};

type CreateApprovedAddressPayload = {
  barangayId: number;
  street: string;
  isActive: boolean;
};

type AdminAddressMutationResponse = {
  data?: { ok?: boolean; id?: number };
  error?: string;
};

export const ADMIN_ADDRESSES_QUERY_KEY = ["admin-addresses"] as const;

async function fetchAdminAddresses(): Promise<ApprovedAddressRow[]> {
  const response = await fetch("/api/admin/addresses", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as { data?: ApprovedAddressRow[]; error?: string };
  if (!response.ok) {
    throw new Error(json.error || "Failed to load approved addresses");
  }

  return json.data ?? [];
}

export function useAdminAddressesQuery() {
  return useQuery({
    queryKey: ADMIN_ADDRESSES_QUERY_KEY,
    queryFn: fetchAdminAddresses,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useCreateApprovedAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateApprovedAddressPayload) => {
      const response = await fetch("/api/admin/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as AdminAddressMutationResponse;
      if (!response.ok) {
        throw new Error(json.error || "Failed to create approved address");
      }
      return json;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_ADDRESSES_QUERY_KEY });
    },
  });
}

export function useToggleApprovedAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/admin/addresses/${encodeURIComponent(String(id))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ isActive }),
      });

      const json = (await response.json()) as AdminAddressMutationResponse;
      if (!response.ok) {
        throw new Error(json.error || "Failed to update address");
      }
      return json;
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_ADDRESSES_QUERY_KEY });
      const previous = queryClient.getQueryData<ApprovedAddressRow[]>(ADMIN_ADDRESSES_QUERY_KEY);

      queryClient.setQueryData<ApprovedAddressRow[]>(ADMIN_ADDRESSES_QUERY_KEY, (current) => {
        const rows = current ?? [];
        return rows.map((row) => (row.id === id ? { ...row, is_active: isActive } : row));
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ADMIN_ADDRESSES_QUERY_KEY, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_ADDRESSES_QUERY_KEY });
    },
  });
}

export function useDeleteApprovedAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/addresses/${encodeURIComponent(String(id))}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const json = (await response.json()) as AdminAddressMutationResponse;
      if (!response.ok) {
        throw new Error(json.error || "Failed to delete address");
      }
      return json;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_ADDRESSES_QUERY_KEY });
      const previous = queryClient.getQueryData<ApprovedAddressRow[]>(ADMIN_ADDRESSES_QUERY_KEY);

      queryClient.setQueryData<ApprovedAddressRow[]>(ADMIN_ADDRESSES_QUERY_KEY, (current) => {
        const rows = current ?? [];
        return rows.filter((row) => row.id !== id);
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ADMIN_ADDRESSES_QUERY_KEY, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_ADDRESSES_QUERY_KEY });
    },
  });
}