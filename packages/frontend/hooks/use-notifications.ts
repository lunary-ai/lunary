"use client"

import { notifications } from "@mantine/notifications"

type NotificationProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useNotifications() {
  const notify = ({ title, description, variant = "default" }: NotificationProps) => {
    notifications.show({
      title,
      message: description,
      color: variant === "destructive" ? "red" : "blue",
    })
  }

  return {
    notify,
  }
}
