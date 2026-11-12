import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Headphones, X } from "lucide-react";
export type MediaHandle = { seek: (seconds: number) => boolean };
export const MediaPanel = forwardRef<
  MediaHandle,
  { side: "Original" | "Dub"; trackKey: string }
>(function MediaPanel({ side, trackKey }, ref) {
  const [file, setFile] = useState<{
      name: string;
      url: string;
      video: boolean;
    } | null>(null),
    [error, setError] = useState("");
  const player = useRef<HTMLMediaElement | null>(null);
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url);
    },
    [file],
  );
  useEffect(() => {
    setFile(null);
    setError("");
  }, [trackKey]);
  useImperativeHandle(ref, () => ({
    seek(seconds) {
      if (!player.current || !file) return false;
      if (player.current.readyState < 1) {
        setError("Wait for the media to load, then try the timestamp again.");
        return true;
      }
      if (seconds >= player.current.duration) {
        setError(
          "This timestamp is outside the attached file. Check that you selected the correct track.",
        );
        return true;
      }
      player.current.currentTime = Math.max(0, seconds);
      void player.current
        .play()
        .catch(() =>
          setError("Use the player’s Play control to start this file."),
        );
      return true;
    },
  }));
  return (
    <div className="media-panel">
      <div className="media-heading">
        <Headphones size={16} />
        <strong>{side} audio</strong>
        {file && (
          <button
            className="icon-button"
            onClick={() => setFile(null)}
            aria-label={`Remove ${side.toLowerCase()} media`}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {file ? (
        <>
          <small className="filename">{file.name}</small>
          {file.video ? (
            <video
              ref={(node) => {
                player.current = node;
              }}
              src={file.url}
              controls
              preload="metadata"
              aria-label={`${side} video player`}
              onError={() =>
                setError(
                  "This media format could not be played. Try MP4 video or MP3/WAV audio.",
                )
              }
            />
          ) : (
            <audio
              ref={(node) => {
                player.current = node;
              }}
              src={file.url}
              controls
              preload="metadata"
              aria-label={`${side} audio player`}
              onError={() =>
                setError(
                  "This audio could not be played. Try an MP3 or WAV file.",
                )
              }
            />
          )}
        </>
      ) : (
        <label className="media-attach">
          Attach {side.toLowerCase()} audio / video
          <input
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.webm,.ogg"
            aria-label={`Attach ${side.toLowerCase()} media`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setError("");
              if (f.size > 500_000_000) {
                setError("Choose a media file smaller than 500 MB.");
                return;
              }
              if (
                !/^(audio|video)\//.test(f.type) &&
                !/\.(mp3|wav|m4a|mp4|webm|ogg)$/i.test(f.name)
              ) {
                setError("Choose an audio or video file.");
                return;
              }
              setFile({
                name: f.name,
                url: URL.createObjectURL(f),
                video:
                  f.type.startsWith("video/") || /\.(mp4|webm)$/i.test(f.name),
              });
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
});
