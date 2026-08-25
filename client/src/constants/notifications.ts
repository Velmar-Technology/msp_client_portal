import type React from "react";
import { Bell, Mail, Smartphone, Ticket, UserCheck, RefreshCw, XCircle, MessageCircle } from "lucide-react";
import type { NotificationEventType, ChannelPreference } from "@/services/notificationPreferenceService";

export interface NotificationEventDefinition {
  key: NotificationEventType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NOTIFICATION_EVENT_DEFINITIONS: NotificationEventDefinition[] = [
  {
    key: "TICKET_CREATED",
    label: "Ticket Created",
    description: "When a new support ticket is opened",
    icon: Ticket,
  },
  {
    key: "TICKET_ASSIGNED",
    label: "Ticket Assigned",
    description: "When a ticket is assigned to a technician",
    icon: UserCheck,
  },
  {
    key: "TICKET_STATUS_CHANGED",
    label: "Status Changed",
    description: "When a ticket status is updated",
    icon: RefreshCw,
  },
  {
    key: "TICKET_CANCELLED",
    label: "Ticket Cancelled",
    description: "When a ticket is cancelled",
    icon: XCircle,
  },
  {
    key: "NEW_REPLY",
    label: "New Reply",
    description: "When someone replies to your ticket",
    icon: MessageCircle,
  },
];

export interface NotificationChannelDefinition {
  key: keyof ChannelPreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NOTIFICATION_CHANNEL_DEFINITIONS: NotificationChannelDefinition[] = [
  { key: "in_app", label: "In-App", icon: Bell },
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone },
];

/** Events where the in-app notification channel is mandatory and locked to enabled */
export const FORCE_IN_APP_EVENTS: NotificationEventType[] = [
  "TICKET_CREATED",
  "TICKET_STATUS_CHANGED",
];
