import { describe, it, expect } from "vitest";
import { resolvePageName } from "./pageTitle";

const translations: Record<string, string> = {
  "home.title": "Home",
  "login.signIn": "Sign In",
  "home.register": "Create Account",
  "nav.dashboard": "Dashboard",
  "nav.plans": "Plans",
  "nav.settings": "Settings",
  "nav.account": "Account",
  "nav.allTickets": "All Tickets",
  "nav.myTickets": "My Tickets",
  "nav.devices": "Devices",
  "nav.resources": "Resources",
  "nav.maintenance": "Maintenance",
  "nav.billing": "Billing",
  "nav.help": "Help Center",
  "nav.profile": "Profile",
  "nav.notificationPreferences": "Notifications",
  "nav.userManagement": "Users",
  "nav.apiStatus": "API Status",
  "ticketDetail.ticketId": "Ticket ID",
  "plans.addNewPlan": "New Plan",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
};

const t = (key: string) => translations[key] ?? key;
const user = { role: "CLIENT" } as const;

describe("resolvePageName", () => {
  it("resolves top-level breadcrumb routes", () => {
    expect(resolvePageName("/devices", t, user)).toBe("Devices");
    expect(resolvePageName("/resources", t, user)).toBe("Resources");
    expect(resolvePageName("/maintenance", t, user)).toBe("Maintenance");
    expect(resolvePageName("/help", t, user)).toBe("Help Center");
  });

  it("resolves role-conditional ticket list labels", () => {
    expect(resolvePageName("/tickets", t, { role: "ADMIN" })).toBe("All Tickets");
    expect(resolvePageName("/tickets", t, { role: "CLIENT" })).toBe("My Tickets");
  });

  it("resolves dynamic detail routes to their leaf crumb", () => {
    const pageName = resolvePageName("/tickets/abcdef1234567890", t, user);
    expect(pageName).toBe("Ticket ID #abcdef12");
  });

  it("resolves dashboard overrides for protected routes", () => {
    expect(resolvePageName("/dashboard", t, user)).toBe("Dashboard");
    expect(resolvePageName("/tech/dashboard", t, { role: "TECHNICIAN" })).toBe("Dashboard");
  });

  it("resolves public auth and home overrides", () => {
    expect(resolvePageName("/", t)).toBe("Home");
    expect(resolvePageName("/login", t)).toBe("Sign In");
    expect(resolvePageName("/register", t)).toBe("Create Account");
  });

  it("resolves nested breadcrumb leaves for multi-level routes", () => {
    expect(resolvePageName("/plans/new", t, { role: "ADMIN" })).toBe("New Plan");
    expect(resolvePageName("/profile", t, user)).toBe("Profile");
  });

  it("returns null for unmatched routes", () => {
    expect(resolvePageName("/unknown-route", t, user)).toBeNull();
  });

  it("falls back to the default branch when user is null", () => {
    expect(resolvePageName("/tickets", t, null)).toBe("My Tickets");
  });
});