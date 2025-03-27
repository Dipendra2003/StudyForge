import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertWaitlist } from "@shared/schema";

export function useWaitlist() {
  const submitMutation = useMutation({
    mutationFn: async (data: InsertWaitlist) => {
      const response = await apiRequest('POST', '/api/waitlist', data);
      return response.json();
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
