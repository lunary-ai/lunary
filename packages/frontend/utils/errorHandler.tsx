import { notifications } from "@mantine/notifications"
import { IconX } from "@tabler/icons-react"

// Error handler for fetch requests
const errorHandler = async (promise: Promise<any>) => {
  try {
    let res = await promise

    // automatically JSON parse fetch
    if (res.json) res = await res.json()

    const { data, error } = res
    if (error) throw error
    return data || res
  } catch (error: any) {
    console.error(error)
    notifications.show({
      icon: <IconX size={18} />,
      color: "red",
      title: "Error",
      autoClose: 10000,
      message: error.error_description || error.message || error,
    })

    // TODO: Sentry or other error tracking

    return null
  }
}

export default errorHandler
