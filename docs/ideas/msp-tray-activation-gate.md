# Idea One-Pager: MSP Tray Self-Serve Activation Gate

## Problem Statement
**How Might We** provide immediate, unambiguous feedback to end-users on newly installed endpoints so they can see their live 6-digit pairing code on screen, prevent broken ticket attempts, and experience instant activation when their machine is linked by an administrator?

---

## Recommended Direction
Implement an **Activation Gatekeeper** in `msp-tray`. 

When an endpoint has not yet been bound to a subscription slot, `msp-tray` detects `isBound: false` over its named pipe IPC connection and replaces the normal support dashboard with a dedicated, high-priority **Workstation Activation Gate**. This view displays the live 6-digit pairing PIN with a one-click copy button, an active TTL countdown timer (15 minutes), and a "Generate New Code" refresh action. All ticket submission and chat features are gated until pairing succeeds, preventing confusing `403 Forbidden` API crashes.

As soon as a technician enters the code in the MSP Portal, the backend sends a `BIND` frame over the live WebSocket to `msp-agent`. The agent saves the credentials to `C:\ProgramData\MSP\msp-agent.json`, purges the pairing code, broadcasts an `AGENT_BOUND` event across the named pipe to `msp-tray`, and `msp-tray` plays an activation chime, dismisses the gate, and immediately transitions into the fully active support and diagnostics interface.

---

## Key Assumptions to Validate
- [ ] **Assumption 1 (Named Pipe IPC Reliability):** The Tauri desktop tray can reliably receive push broadcasts from the Windows Service over `\\.\pipe\msp-agent-ipc` when running under standard user privileges.
- [ ] **Assumption 2 (User Comprehension):** Non-technical end users understand that the 6-digit code must be handed to their company admin or IT contact.
- [ ] **Assumption 3 (Code Regeneration):** When a user clicks "Generate New Code", the agent invalidates the old code on the backend and updates the UI without requiring an application restart.

---

## MVP Scope

### In Scope (MVP)
1. **Agent IPC Contract Expansion (`packages/msp-agent/src/ipc_server.rs`):**
   - Enhance `GET_AGENT_STATUS` response payload to include `isBound`, `pairingCode`, and `pairingCodeExpiresAt`.
   - Add IPC command handler `REFRESH_PAIRING_CODE` to allow the tray to request a fresh OTP on demand.
   - On successful `handle_bind()`, invoke `ipc_server::broadcast_push_event("AGENT_BOUND", &json!({ "slotId": slot_id }))`.
2. **Tray IPC & State Layer (`packages/msp-tray/src-tauri/src/ipc.rs` & `services/tauri.ts`):**
   - Update `AgentStatus` struct and TypeScript interface to expose `isBound`, `pairingCode`, and `pairingCodeExpiresAt`.
   - Listen for `AGENT_BOUND` IPC events to trigger immediate unlocking.
3. **UI Activation Component (`packages/msp-tray/src/components/ActivationGate.tsx`):**
   - Focused card with:
     - Large monospaced digit display (e.g. `839 - 201`).
     - "Copy Code" button with visual feedback (`Copied!`).
     - Live countdown badge (`Expires in 14:15`).
     - "Refresh Code" button with spinner.
     - Guidance text: *"Share this code with your IT administrator or enter it in your portal to link this workstation."*
4. **App Routing Gate (`packages/msp-tray/src/App.tsx`):**
   - If `agentStatus && !agentStatus.isBound`, render `<ActivationGate />` instead of the standard ticket/chat tabs.

---

## Not Doing (and Why)
- **Not Doing: Unauthenticated / Emergency Guest Tickets**
  - *Why:* Opening an unauthenticated ticket submission endpoint creates severe spam, DDoS, and tenant-spoofing vectors. Machine pairing must precede ticket creation.
- **Not Doing: In-App Browser OAuth / Magic Link (in Phase 1)**
  - *Why:* End users at shared workstations or shift desks frequently do not have portal credentials; adding an in-app SSO flow increases frontend scope significantly. We can add this as a Phase 2 enhancement.
- **Not Doing: Custom Windows URI Scheme (`msp-client://`)**
  - *Why:* Requires installer registry modifications and protocol handler registration; adds unnecessary moving parts for the initial fix.
