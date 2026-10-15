import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainerApi, AssignMemberPayload } from '../../../api/trainerApi';

export const TRAINER_QUERY_KEYS = {
  all: ['owner', 'trainers'] as const,
  list: (search?: string) => ['owner', 'trainers', 'list', search || ''] as const,
  detail: (trainerUserId: string) => ['owner', 'trainers', 'detail', trainerUserId] as const,
};

export function useOwnerTrainers(search?: string) {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.list(search),
    queryFn: () => trainerApi.getTrainers(search),
    staleTime: 30 * 1000,
  });
}

export function useTrainerDetail(trainerUserId: string | null) {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.detail(trainerUserId || ''),
    queryFn: () => trainerApi.getTrainerDetail(trainerUserId!),
    enabled: Boolean(trainerUserId),
    staleTime: 15 * 1000,
  });
}

export function useAssignMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignMemberPayload) => trainerApi.assignMember(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.detail(variables.trainerUserId) });
      queryClient.invalidateQueries({ queryKey: ['owner', 'members'] });
    },
  });
}

export function useRemoveAssignment(trainerUserId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => trainerApi.removeAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      if (trainerUserId) {
        queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.detail(trainerUserId) });
      }
      queryClient.invalidateQueries({ queryKey: ['owner', 'members'] });
    },
  });
}
