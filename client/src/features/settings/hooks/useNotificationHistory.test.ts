import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotificationHistory } from "./useNotificationHistory";
import { useNotificationStore } from "@/store/useNotificationStore";

vi.mock("@/store/useNotificationStore");

describe("useNotificationHistory", () => {
  const mockFetchNotifications = vi.fn();
  const mockMarkAsRead = vi.fn();
  const mockMarkAllAsRead = vi.fn();
  const mockClearNotifications = vi.fn();
  const mockStartStream = vi.fn();

  const mockNotifications = [
    {
      id: "n1",
      user_id: "u1",
      title: "Ticket Created",
      message: "Your ticket #123 was created",
      link: "/tickets/123",
      ticket_id: "t1",
      type: "TICKET_CREATED",
      read: false,
      metadata: null,
      tenant_id: "tenant-1",
      created_at: "2026-08-11T10:00:00Z",
    },
    {
      id: "n2",
      user_id: "u1",
      title: "Status Changed",
      message: "Ticket status changed to RESOLVED",
      link: "/tickets/123",
      ticket_id: "t1",
      type: "TICKET_STATUS_CHANGED",
      read: true,
      metadata: null,
      tenant_id: "tenant-1",
      created_at: "2026-08-11T09:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      isLoading: false,
      fetchNotifications: mockFetchNotifications,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearNotifications: mockClearNotifications,
      startStream: mockStartStream,
    });
  });

  it("should fetch notifications and start real-time stream on mount", () => {
    renderHook(() => useNotificationHistory());
    expect(mockFetchNotifications).toHaveBeenCalledTimes(1);
    expect(mockStartStream).toHaveBeenCalledTimes(1);
  });

  it("should return all notifications initially", () => {
    const { result } = renderHook(() => useNotificationHistory());
    expect(result.current.notifications.length).toBe(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it("should filter notifications by search query", () => {
    const { result } = renderHook(() => useNotificationHistory());

    act(() => {
      result.current.setSearchQuery("RESOLVED");
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].id).toBe("n2");
  });

  it("should filter notifications by read status", () => {
    const { result } = renderHook(() => useNotificationHistory());

    act(() => {
      result.current.setReadFilter("UNREAD");
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].id).toBe("n1");

    act(() => {
      result.current.setReadFilter("READ");
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].id).toBe("n2");
  });

  it("should filter notifications by event type", () => {
    const { result } = renderHook(() => useNotificationHistory());

    act(() => {
      result.current.setTypeFilter("TICKET_CREATED");
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].id).toBe("n1");
  });

  it("should call markAsRead handler when requested", async () => {
    const { result } = renderHook(() => useNotificationHistory());

    await act(async () => {
      await result.current.handleMarkAsRead("n1");
    });

    expect(mockMarkAsRead).toHaveBeenCalledWith("n1");
  });

  it("should call markAllAsRead handler when requested", async () => {
    const { result } = renderHook(() => useNotificationHistory());

    await act(async () => {
      await result.current.handleMarkAllAsRead();
    });

    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it("should call clearNotifications handler when requested", async () => {
    const { result } = renderHook(() => useNotificationHistory());

    await act(async () => {
      await result.current.handleClearAll();
    });

    expect(mockClearNotifications).toHaveBeenCalledTimes(1);
  });
});
