import { ActionIcon, Box, Group, Paper, Slider, Text } from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import classes from "./index.module.css";

interface AudioPlayerProps {
  src?: string;
  compact?: boolean;
  transcript?: string;
}
export function AudioPlayer({
  src,
  compact = false,
  transcript,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!src) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        &lt;audio message&gt;
        {transcript && (
          <>
            <br />
            <Text size="xs" mt={4}>
              {transcript}
            </Text>
          </>
        )}
      </Text>
    );
  }

  return (
    <>
      <Paper
        className={classes.audioPlayer}
        maw={compact ? 220 : undefined}
        p={compact ? 0 : 6}
      >
        <audio ref={audioRef} src={src} />
        <Group gap={3} style={{ overflow: "hidden" }}>
          <ActionIcon
            variant="subtle"
            onClick={togglePlay}
            size={compact ? "sm" : "md"}
          >
            {isPlaying ? (
              <IconPlayerPause size={16} />
            ) : (
              <IconPlayerPlay size={16} />
            )}
          </ActionIcon>

          <Slider
            value={currentTime}
            onChange={handleSliderChange}
            max={duration}
            min={0}
            showLabelOnHover={false}
            size="xs"
            style={{ flex: 1 }}
          />

          <Text size="xs" c="dimmed" px={compact ? 6 : 8}>
            {currentTime === 0 && !isPlaying
              ? formatTime(duration)
              : formatTime(currentTime)}
          </Text>
        </Group>
      </Paper>

      {transcript && (
        <Text size="xs" mt={compact ? 6 : "sm"} c="gray">
          {transcript}
        </Text>
      )}
    </>
  );
}
