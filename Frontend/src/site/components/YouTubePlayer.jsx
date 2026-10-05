import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import {
  loadYouTubeIframeApi,
  youtubeThumbnailUrl,
  youtubeVideoId,
} from "../../utils/youtubeEmbed.js";
import "./YouTubePlayer.css";

const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_PAUSED = 2;
const STATE_BUFFERING = 3;
const AUTOPLAY_FALLBACK_MS = 2500;
const PROGRESS_POLL_MS = 250;

function formatTime(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

function callPlayer(player, method, ...args) {
  try {
    return typeof player?.[method] === "function" ? player[method](...args) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * YouTube embed without YouTube's own chrome (logo, share, watch later, title bar,
 * pause/end suggestions). The iframe is rendered taller than the frame so its
 * top/bottom overlays are clipped, pointer events are blocked, and custom controls
 * are drawn on top. Fills its positioned parent.
 */
export default function YouTubePlayer({
  url,
  title = "Video",
  autoPlay = true,
  poster = "",
  className = "",
}) {
  const videoId = useMemo(() => youtubeVideoId(url), [url]);
  const coverSrc = poster || youtubeThumbnailUrl(videoId);

  const rootRef = useRef(null);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playerState, setPlayerState] = useState(-1);
  const [hasStarted, setHasStarted] = useState(false);
  const [awaitingAutoplay, setAwaitingAutoplay] = useState(autoPlay);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!videoId || !mount) return undefined;

    let cancelled = false;
    let autoplayTimer = null;

    setReady(false);
    setFailed(false);
    setPlayerState(-1);
    setHasStarted(false);
    setAwaitingAutoplay(autoPlay);
    setCurrentTime(0);
    setDuration(0);

    // The API replaces this node with its iframe, so keep it outside React's tree.
    const host = document.createElement("div");
    mount.appendChild(host);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(host, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              setReady(true);
              const iframe = callPlayer(event.target, "getIframe");
              if (iframe) iframe.title = titleRef.current;
              setDuration(callPlayer(event.target, "getDuration") || 0);
              setMuted(Boolean(callPlayer(event.target, "isMuted")));
              if (!autoPlay) return;
              callPlayer(event.target, "playVideo");
              // Browsers may block unmuted autoplay; retry muted so the video still starts.
              autoplayTimer = window.setTimeout(() => {
                if (cancelled) return;
                const state = callPlayer(event.target, "getPlayerState");
                if (state !== STATE_PLAYING && state !== STATE_BUFFERING) {
                  callPlayer(event.target, "mute");
                  setMuted(true);
                  callPlayer(event.target, "playVideo");
                }
                setAwaitingAutoplay(false);
              }, AUTOPLAY_FALLBACK_MS);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              setPlayerState(event.data);
              if (event.data === STATE_PLAYING) {
                setHasStarted(true);
                setAwaitingAutoplay(false);
                setDuration(callPlayer(event.target, "getDuration") || 0);
              }
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (autoplayTimer) window.clearTimeout(autoplayTimer);
      callPlayer(playerRef.current, "destroy");
      playerRef.current = null;
      mount.replaceChildren();
    };
  }, [videoId, autoPlay]);

  useEffect(() => {
    if (playerState !== STATE_PLAYING) return undefined;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      setCurrentTime(callPlayer(player, "getCurrentTime") || 0);
      const total = callPlayer(player, "getDuration");
      if (total) setDuration(total);
    }, PROGRESS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [playerState]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const isPlaying = playerState === STATE_PLAYING;
  const isEnded = playerState === STATE_ENDED;
  const isPaused = hasStarted && playerState === STATE_PAUSED;
  const showStartCover = !hasStarted && !failed;
  const isLoading = showStartCover && (!ready || awaitingAutoplay || playerState === STATE_BUFFERING);
  const canFullscreen =
    typeof document !== "undefined" && Boolean(document.fullscreenEnabled);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (callPlayer(player, "getPlayerState") === STATE_ENDED) {
      callPlayer(player, "seekTo", 0, true);
    }
    callPlayer(player, "playVideo");
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) callPlayer(playerRef.current, "pauseVideo");
    else play();
  }, [isPlaying, play]);

  const handleSeek = useCallback((event) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    setCurrentTime(next);
    callPlayer(playerRef.current, "seekTo", next, true);
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (callPlayer(player, "isMuted")) {
      callPlayer(player, "unMute");
      setMuted(false);
    } else {
      callPlayer(player, "mute");
      setMuted(true);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      root.requestFullscreen?.().catch(() => {});
    }
  }, []);

  if (!videoId) return null;

  const rootClass = [
    "yt-clean",
    isPlaying ? "is-playing" : "",
    isPaused || isEnded ? "is-stopped" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={rootClass}>
      <div ref={mountRef} className="yt-clean__frame" aria-hidden="true" />

      {hasStarted && !failed ? (
        <button
          type="button"
          className="yt-clean__hit"
          aria-label={isPlaying ? "Pause video" : "Play video"}
          onClick={togglePlay}
        />
      ) : null}

      {showStartCover ? (
        <div className="yt-clean__cover">
          {coverSrc ? <img src={coverSrc} alt="" /> : null}
          {isLoading ? (
            <span className="yt-clean__spinner" role="status" aria-label="Loading video" />
          ) : (
            <button type="button" className="yt-clean__big-btn" aria-label="Play video" onClick={play}>
              <Play size={28} fill="currentColor" />
            </button>
          )}
        </div>
      ) : null}

      {isPaused ? (
        <div className="yt-clean__cover yt-clean__cover--paused">
          <button type="button" className="yt-clean__big-btn" aria-label="Play video" onClick={play}>
            <Play size={28} fill="currentColor" />
          </button>
        </div>
      ) : null}

      {isEnded ? (
        <div className="yt-clean__cover">
          {coverSrc ? <img src={coverSrc} alt="" /> : null}
          <button type="button" className="yt-clean__big-btn" aria-label="Replay video" onClick={play}>
            <RotateCcw size={26} />
          </button>
        </div>
      ) : null}

      {failed ? (
        <div className="yt-clean__cover yt-clean__cover--error" role="alert">
          {coverSrc ? <img src={coverSrc} alt="" /> : null}
          <p>This video can&apos;t be played right now.</p>
        </div>
      ) : null}

      {hasStarted && !failed ? (
        <div className="yt-clean__controls">
          <button
            type="button"
            className="yt-clean__ctrl"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <input
            type="range"
            className="yt-clean__seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label="Seek"
            disabled={!duration}
          />
          <span className="yt-clean__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            className="yt-clean__ctrl"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {canFullscreen ? (
            <button
              type="button"
              className="yt-clean__ctrl"
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
