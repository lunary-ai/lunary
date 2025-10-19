import { Group, type GroupProps, Skeleton } from "@mantine/core";

type AiFilterSkeletonProps = Omit<GroupProps, "children">;

export default function AiFilterSkeleton({
  gap = "xs",
  ...props
}: AiFilterSkeletonProps) {
  return (
    <Group gap={gap} {...props}>
      <Skeleton height={30} radius="md" w={140} />
      <Skeleton height={30} radius="md" w={120} />
      <Skeleton height={30} radius="md" w={80} />
    </Group>
  );
}
