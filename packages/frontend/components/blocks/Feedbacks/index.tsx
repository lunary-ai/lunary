import { openUpgrade } from "@/components/layout/UpgradeModal";
import { useOrg } from "@/utils/dataHooks";

import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Stack,
  Textarea,
  useComputedColorScheme,
} from "@mantine/core";
import { IconMessage, IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { useState } from "react";
import { Feedback } from "shared";

function getColor(color: string) {
  const scheme = useComputedColorScheme();
  return scheme === "light" ? `var(--mantine-color-${color}-5)` : color;
}

export default function Feedbacks({
  feedback,
  updateFeedback,
}: {
  feedback: Feedback;
  updateFeedback: (...props: any) => any;
}) {
  const { org } = useOrg();

  if (!feedback) {
    feedback = { comment: null, thumb: null };
  }

  if (feedback?.thumbs) {
    feedback.thumb = feedback.thumbs; // legacy key name
  }

  if (feedback?.thumbs && feedback.thumb) {
    delete feedback.thumbs;
  }

  if (!feedback.comment) {
    feedback.comment = null;
  }

  function ThumbFeedback({ value }: { value?: "up" | "down" | null }) {
    function ThumbUp() {
      const color = getColor(value === "up" ? "green" : "gray");
      return <IconThumbUp color={color} fill={color} fillOpacity={0.2} />;
    }

    function ThumbDown() {
      const color = getColor(value === "down" ? "red" : "gray");
      return <IconThumbDown color={color} fill={color} fillOpacity={0.2} />;
    }

    return (
      <Group gap={0}>
        <ActionIcon
          variant="transparent"
          onClick={() => {
            if (feedback.thumb === "down") {
              feedback.thumb = null;
            } else {
              feedback.thumb = "down";
            }
            update(feedback);
          }}
        >
          <ThumbDown />
        </ActionIcon>
        <ActionIcon
          variant="transparent"
          onClick={() => {
            if (feedback.thumb === "up") {
              feedback.thumb = null;
            } else {
              feedback.thumb = "up";
            }
            update(feedback);
          }}
        >
          <ThumbUp />
        </ActionIcon>
      </Group>
    );
  }

  const update = (feedback) => {
    if (org.plan === "free") {
      return openUpgrade();
    }
    updateFeedback(feedback);
  };

  function CommentFeedback({ value }) {
    const [comment, setComment] = useState(value);
    return (
      <Popover width={300} trapFocus position="bottom" withArrow shadow="md">
        <Popover.Target>
          <ActionIcon variant="transparent">
            <IconMessage color={value ? "green" : "gray"} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack align="end" mt={2}>
            <Textarea
              value={comment}
              size="xs"
              autosize
              minRows={2}
              w="100%"
              placeholder="Add a comment"
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              size="xs"
              variant="default"
              style={{ float: "right" }}
              onClick={() => {
                feedback.comment = comment;
                update(feedback);
              }}
            >
              Save
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  }

  return (
    <Group>
      <CommentFeedback value={feedback?.comment} />
      <ThumbFeedback value={feedback?.thumb} />
    </Group>
  );
}
