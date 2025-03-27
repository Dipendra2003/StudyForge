import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/queryClient";
import type { InsertWaitlist } from "@shared/schema";

export function useWaitlist() {
  const submitMutation = useMutation({
    mutationFn: async (data: InsertWaitlist) => {
      return apiPost('/api/waitlist', data);
    }
  });

  return {
    submitToWaitlist: submitMutation.mutate,
    isPending: submitMutation.isPending,
    isSuccess: submitMutation.isSuccess,
    isError: submitMutation.isError,
    error: submitMutation.error
  };
}
