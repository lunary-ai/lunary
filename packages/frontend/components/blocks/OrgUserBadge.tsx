import { useOrgUser } from "@/utils/dataHooks"
import { Badge } from "@mantine/core"
import UserAvatar from "./UserAvatar"

export default function OrgUserBadge({ userId }) {
  const { user, loading } = useOrgUser(userId)

  if (!userId || loading) {
    return null
  }

  return (
    <Badge
      color={user?.color}
      variant="light"
      size="md"
      pl={3}
      lh={1.5}
      tt={"none"}
      leftSection={<UserAvatar profile={user} size={15} />}
    >
      {user?.name || "Unknown"}
    </Badge>
  )
}
