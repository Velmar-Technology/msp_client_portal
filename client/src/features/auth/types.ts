/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, wizard steps, view modes).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts" or "./api/authService".
 */

export type AuthMode = "login" | "register" | "forgot_password" | "reset_password" | "verify_otp";
export type OtpVerificationStep = "input" | "submitting" | "success" | "error";
