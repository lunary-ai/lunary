import { notifications } from "@mantine/notifications"
import { IconX } from "@tabler/icons-react"

// Error handler for fetch requests
const errorHandler = async (promise: Promise<any>) => {
  try {
    let res = await promise

    // automatically JSON parse fetch
    if (res?.json) res = await res.json()

    const { data, error } = res
    if (error) throw error
    return data || res
  } catch (error: any) {
    console.error(error)

    notifications.show({
      icon: <IconX size={18} />,
      color: "red",
      id: "error-alert",
      title: "Error",
      autoClose: 4000,
      message: error.error_description || error.message || error,
    })

    return null
  }
}

export function showErrorNotification(title: any, message?: string) {
  console.error(message)

  // prevent 10x same error from being shown
  notifications.hide("error-alert")

  notifications.show({
    icon: <IconX size={18} />,
    id: "error-alert",
    title: title || "Server error",
    message: message || "Something went wrong",
    color: "red",
    autoClose: 4000,
  })
}

export default errorHandler
