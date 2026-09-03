import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  userService,
  type UserListParams,
  type UserRole,
  type ClientType,
} from "./userService";

export const USERS_QUERY_KEYS = {
  all: ["users"] as const,
  list: (params: UserListParams) => [...USERS_QUERY_KEYS.all, "list", params] as const,
  stats: () => [...USERS_QUERY_KEYS.all, "stats"] as const,
  technicians: () => [...USERS_QUERY_KEYS.all, "technicians"] as const,
  clients: () => [...USERS_QUERY_KEYS.all, "clients"] as const,
  profile: () => [...USERS_QUERY_KEYS.all, "profile"] as const,
};

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn: () => userService.getAllUsers(params),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.stats(),
    queryFn: () => userService.getUserStats(),
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.technicians(),
    queryFn: () => userService.getTechnicians(),
  });
}

export function useClients() {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.clients(),
    queryFn: () => userService.getClients(),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      userService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      userService.toggleUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateUserClientType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, clientType }: { userId: string; clientType: ClientType }) =>
      userService.updateUserClientType(userId, clientType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}
