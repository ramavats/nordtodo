import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/tauriApi";
import type { UserPreferences } from "@/types";

const PREFS_KEY = ["preferences"] as const;

export function usePreferences() {
  return useQuery({
    queryKey: PREFS_KEY,
    queryFn: api.getPreferences,
    staleTime: Infinity, // prefs rarely change
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => api.updatePreferences(patch),
    onSuccess: (updated) => {
      qc.setQueryData(PREFS_KEY, updated);
    },
  });
}
