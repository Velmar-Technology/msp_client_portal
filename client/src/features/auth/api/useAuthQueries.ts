import { useMutation } from "@tanstack/react-query";
import {
  authService,
  type LoginPayload,
  type RegisterPayload,
  type GoogleAuthPayload,
} from "./authService";

export const AUTH_QUERY_KEYS = {
  all: ["auth"] as const,
  session: () => [...AUTH_QUERY_KEYS.all, "session"] as const,
};

export function useLoginMutation() {
  return useMutation({
    mutationFn: ({ payload, rememberMe }: { payload: LoginPayload; rememberMe?: boolean }) =>
      authService.login(payload, rememberMe),
  });
}

export function useGoogleLoginMutation() {
  return useMutation({
    mutationFn: ({ payload, rememberMe }: { payload: GoogleAuthPayload; rememberMe?: boolean }) =>
      authService.loginWithGoogle(payload, rememberMe),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      authService.verifyEmail(email, otp),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, password, confirmPassword }: { token: string; password: string; confirmPassword: string }) =>
      authService.resetPassword(token, password, confirmPassword),
  });
}
