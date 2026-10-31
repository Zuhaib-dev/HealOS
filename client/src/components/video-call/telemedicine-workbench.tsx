"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  UserRound,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";

type CallStatus =
  | "starting"
  | "waiting"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended";

export function TelemedicineWorkbench({
  appointmentId,
  isDoctor,
  onEndCall,
}: {
  appointmentId: string;
  isDoctor: boolean;
  onEndCall: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasAudioInput, setHasAudioInput] = useState(false);
  const [hasVideoInput, setHasVideoInput] = useState(false);
  const [status, setStatus] = useState<CallStatus>("starting");
  const [hasRemoteMedia, setHasRemoteMedia] = useState(false);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [error, setError] = useState("");
  const [deviceNotice, setDeviceNotice] = useState("");
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setStatus("ended");
  }, []);

  useEffect(() => {
    const socket = getSocket();
    let disposed = false;
    let joined = false;
    let peerPresent = false;
    let makingOffer = false;
    let hasStartedRemotePlayback = false;
    let remoteStream = new MediaStream();
    const pendingCandidates: RTCIceCandidateInit[] = [];
    let pc: RTCPeerConnection | null = null;

    const handleOffer = async ({
      offer,
    }: {
      offer: RTCSessionDescriptionInit;
    }) => {
      if (isDoctor || !pc || pc.signalingState === "closed") return;
      try {
        if (pc.signalingState !== "stable") return;
        await pc.setRemoteDescription(offer);
        for (const candidate of pendingCandidates.splice(0)) {
          await pc.addIceCandidate(candidate);
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", {
          appointmentId,
          answer: pc.localDescription,
        });
        if (!disposed) setStatus("connecting");
      } catch (cause) {
        console.error("Unable to answer teleconsult offer", cause);
        if (!disposed)
          setError(
            "Could not connect to the other participant. Try reconnecting.",
          );
      }
    };

    const handleAnswer = async ({
      answer,
    }: {
      answer: RTCSessionDescriptionInit;
    }) => {
      if (!isDoctor || !pc || pc.signalingState !== "have-local-offer") return;
      try {
        await pc.setRemoteDescription(answer);
        for (const candidate of pendingCandidates.splice(0)) {
          await pc.addIceCandidate(candidate);
        }
        if (!disposed) setStatus("connecting");
      } catch (cause) {
        console.error("Unable to apply teleconsult answer", cause);
        if (!disposed)
          setError(
            "Could not connect to the other participant. Try reconnecting.",
          );
      }
    };

    const handleCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (!pc || pc.signalingState === "closed") return;
      try {
        if (pc.remoteDescription) await pc.addIceCandidate(candidate);
        else pendingCandidates.push(candidate);
      } catch (cause) {
        console.warn("Could not add teleconsult network candidate", cause);
      }
    };

    const createOffer = async () => {
      if (!pc || pc.signalingState !== "stable" || makingOffer) return;
      try {
        makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", {
          appointmentId,
          offer: pc.localDescription,
        });
        if (!disposed) setStatus("connecting");
      } catch (cause) {
        console.error("Unable to create teleconsult offer", cause);
        if (!disposed) setError("Could not start the call. Try reconnecting.");
      } finally {
        makingOffer = false;
      }
    };

    const handleParticipantJoined = () => {
      peerPresent = true;
      if (!isDoctor) return;
      setError("");
      void createOffer();
    };

    const handleRoomState = ({
      participantPresent,
    }: {
      participantPresent: boolean;
    }) => {
      peerPresent = participantPresent;
      if (isDoctor && participantPresent) void createOffer();
    };

    const handleParticipantLeft = () => {
      peerPresent = false;
      remoteStream = new MediaStream();
      hasStartedRemotePlayback = false;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (!disposed) setHasRemoteMedia(false);
      if (!disposed) setRemoteAudioEnabled(false);
      if (!disposed) setStatus("waiting");
    };

    const handleSocketConnect = () => {
      if (!joined || !pc || pc.signalingState === "closed") return;
      setStatus("reconnecting");
      socket.emit("webrtc:join_call", appointmentId);
    };

    const handleSocketDisconnect = () => {
      if (joined && !disposed) setStatus("reconnecting");
    };

    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice_candidate", handleCandidate);
    socket.on("webrtc:user_joined", handleParticipantJoined);
    socket.on("webrtc:room_state", handleRoomState);
    socket.on("webrtc:user_left", handleParticipantLeft);
    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);

    const startCall = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Video calls require a supported browser and a secure connection (HTTPS).",
          );
        }
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
        const videoConstraints: MediaTrackConstraints = {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        };
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: videoConstraints,
          });
        } catch (cause) {
          const mediaError = cause as DOMException;
          if (
            mediaError.name !== "NotFoundError" &&
            mediaError.name !== "OverconstrainedError"
          ) {
            throw cause;
          }

          // A missing camera should not prevent an audio consultation, and a
          // missing microphone should not prevent a video consultation.
          const fallbacks = await Promise.allSettled([
            navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: false,
            }),
            navigator.mediaDevices.getUserMedia({
              audio: false,
              video: videoConstraints,
            }),
          ]);
          const tracks = fallbacks.flatMap((result) =>
            result.status === "fulfilled" ? result.value.getTracks() : [],
          );
          if (!tracks.length) throw cause;
          stream = new MediaStream(tracks);
        }
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setHasAudioInput(stream.getAudioTracks().length > 0);
        setHasVideoInput(stream.getVideoTracks().length > 0);
        if (!stream.getVideoTracks().length && stream.getAudioTracks().length) {
          setDeviceNotice(
            "Camera not found. You can continue with audio only.",
          );
        } else if (
          !stream.getAudioTracks().length &&
          stream.getVideoTracks().length
        ) {
          setDeviceNotice(
            "Microphone not found. You can continue with video only.",
          );
        } else {
          setDeviceNotice("");
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const turnUrls = process.env.NEXT_PUBLIC_TURN_URL?.split(",")
          .map((url) => url.trim())
          .filter(Boolean);
        const iceServers: RTCIceServer[] = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ];
        if (turnUrls?.length) {
          iceServers.push({
            urls: turnUrls,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          });
        }
        pc = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = pc;
        stream.getTracks().forEach((track) => pc?.addTrack(track, stream));
        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          socket.emit("webrtc:ice_candidate", {
            appointmentId,
            candidate: event.candidate,
          });
        };
        pc.onnegotiationneeded = () => {
          if (isDoctor && peerPresent) void createOffer();
        };

        pc.ontrack = (event) => {
          const incoming = event.streams[0];
          if (incoming) remoteStream = incoming;
          else if (
            !remoteStream
              .getTracks()
              .some((track) => track.id === event.track.id)
          )
            remoteStream.addTrack(event.track);
          if (!disposed) setHasRemoteMedia(true);
          if (remoteVideoRef.current) {
            // Muted autoplay is allowed by browsers, so the remote face appears
            // immediately. A user gesture below enables incoming audio.
            if (!hasStartedRemotePlayback) {
              remoteVideoRef.current.muted = true;
              hasStartedRemotePlayback = true;
            }
            remoteVideoRef.current.srcObject = remoteStream;
            void remoteVideoRef.current.play().catch(() => {
              if (!disposed) {
                setPlaybackError(
                  "Playback was blocked. Use the audio button to start the call media.",
                );
              }
            });
          }
        };
        pc.onconnectionstatechange = () => {
          if (!pc || disposed) return;
          if (pc.connectionState === "connected") {
            setError("");
            setStatus("connected");
          } else if (pc.connectionState === "connecting")
            setStatus("connecting");
          else if (pc.connectionState === "disconnected")
            setStatus("reconnecting");
          else if (pc.connectionState === "failed") {
            setStatus("reconnecting");
            setError("Connection failed. Check your network and reconnect.");
          }
        };
        pc.oniceconnectionstatechange = () => {
          if (pc?.iceConnectionState === "failed" && !disposed) {
            void pc.restartIce();
          }
        };

        // Register for room events before joining so neither participant misses the arrival signal.
        socket.emit("webrtc:join_call", appointmentId);
        joined = true;
        if (!disposed) setStatus("waiting");
      } catch (cause) {
        console.error("Unable to access teleconsult media devices", cause);
        const mediaError = cause as DOMException;
        const message =
          mediaError.name === "NotAllowedError"
            ? "Camera or microphone permission was denied. Allow access in your browser, then reconnect."
            : mediaError.name === "NotFoundError"
              ? "No camera or microphone was found. Connect a device, then reconnect."
              : mediaError.message ||
                "Could not access your camera and microphone.";
        if (!disposed) {
          setError(message);
          setStatus("waiting");
        }
      }
    };

    void startCall();
    return () => {
      disposed = true;
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice_candidate", handleCandidate);
      socket.off("webrtc:user_joined", handleParticipantJoined);
      socket.off("webrtc:room_state", handleRoomState);
      socket.off("webrtc:user_left", handleParticipantLeft);
      socket.off("connect", handleSocketConnect);
      socket.off("disconnect", handleSocketDisconnect);
      if (joined) socket.emit("webrtc:leave_call", appointmentId);
      pc?.close();
      streamCleanup();
    };

    function streamCleanup() {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (peerConnectionRef.current === pc) peerConnectionRef.current = null;
    }
  }, [appointmentId, isDoctor, connectionAttempt]);

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) return;
    const nextMuted = !isMuted;
    tracks.forEach((track) => (track.enabled = !nextMuted));
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!tracks.length) return;
    const nextOff = !isVideoOff;
    tracks.forEach((track) => (track.enabled = !nextOff));
    setIsVideoOff(nextOff);
  };

  const enableRemoteAudio = () => {
    const video = remoteVideoRef.current;
    if (!video) return;
    // Set the media property synchronously within this click gesture so Safari
    // and mobile browsers accept the unmute/play request.
    video.muted = false;
    void video
      .play()
      .then(() => {
        setRemoteAudioEnabled(true);
        setPlaybackError("");
      })
      .catch(() => {
        video.muted = true;
        setRemoteAudioEnabled(false);
        setPlaybackError(
          "Your browser still blocked audio. Check the site sound settings and tap again.",
        );
      });
  };

  const handleEndCall = () => {
    getSocket().emit("webrtc:leave_call", appointmentId);
    endCall();
    onEndCall();
  };

  const statusLabel: Record<CallStatus, string> = {
    starting: "Starting your camera and microphone…",
    waiting: `Waiting for ${isDoctor ? "patient" : "doctor"}`,
    connecting: "Connecting securely…",
    connected: "Call connected",
    reconnecting: "Connection interrupted · reconnecting…",
    ended: "Call ended",
  };

  return (
    <div className="flex min-h-125 h-full w-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-background shadow-sm">
      <div className="relative flex flex-1 items-center justify-center bg-neutral-950 p-3 sm:p-5">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={!remoteAudioEnabled}
          onClick={enableRemoteAudio}
          className={`h-full min-h-80 w-full rounded-xl object-contain sm:object-cover ${hasRemoteMedia ? "block" : "hidden"}`}
        />
        {!hasRemoteMedia && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <div className="flex size-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
              <UserRound className="size-9 text-white/70" />
            </div>
            <p className="font-medium">{statusLabel[status]}</p>
            <p className="text-sm text-white/60">
              Keep this window open while you wait.
            </p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 aspect-video w-28 overflow-hidden rounded-xl border border-white/30 bg-neutral-800 shadow-xl sm:bottom-6 sm:right-6 sm:w-48">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${isVideoOff ? "opacity-0" : "opacity-100"}`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70">
              <VideoOff className="size-6" />
            </div>
          )}
          <span className="absolute bottom-1 left-2 text-[10px] text-white/80">
            You
          </span>
        </div>

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur">
          <span
            className={`size-2 rounded-full ${status === "connected" ? "bg-emerald-400" : status === "reconnecting" ? "bg-amber-400" : "bg-white/50"}`}
          />
          {statusLabel[status]}
        </div>
        {playbackError && hasRemoteMedia && (
          <div
            role="status"
            className="absolute bottom-4 left-4 right-36 rounded-lg bg-black/75 px-3 py-2 text-xs text-white sm:bottom-6 sm:left-6 sm:right-56"
          >
            {playbackError}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="absolute bottom-4 left-4 right-36 rounded-lg bg-destructive/95 px-3 py-2 text-xs text-white sm:bottom-6 sm:left-6 sm:right-56"
          >
            {error}
          </div>
        )}
        {deviceNotice && !error && (
          <div
            role="status"
            className="absolute bottom-4 left-4 right-36 rounded-lg bg-amber-500/90 px-3 py-2 text-xs text-black sm:bottom-6 sm:left-6 sm:right-56"
          >
            {deviceNotice}
          </div>
        )}
      </div>

      <div className="flex min-h-20 items-center justify-center gap-3 border-t border-border/40 bg-card/90 px-4">
        <button
          type="button"
          onClick={toggleMute}
          disabled={!hasAudioInput}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={isMuted}
          className={`rounded-full p-3 transition-colors disabled:opacity-40 ${isMuted ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"}`}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          disabled={!hasVideoInput}
          aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
          aria-pressed={isVideoOff}
          className={`rounded-full p-3 transition-colors disabled:opacity-40 ${isVideoOff ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"}`}
        >
          {isVideoOff ? (
            <VideoOff className="size-5" />
          ) : (
            <Video className="size-5" />
          )}
        </button>
        <div className="mx-1 hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Volume2 className="size-4" /> Audio optimized
        </div>
        {hasRemoteMedia && (
          <button
            type="button"
            onClick={enableRemoteAudio}
            aria-label={
              remoteAudioEnabled ? "Enable call audio" : "Turn on call audio"
            }
            aria-pressed={remoteAudioEnabled}
            className={`rounded-full p-3 transition-colors ${remoteAudioEnabled ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            {remoteAudioEnabled ? (
              <Volume2 className="size-5" />
            ) : (
              <VolumeX className="size-5" />
            )}
          </button>
        )}
        {(status === "reconnecting" || Boolean(error)) && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setStatus("starting");
              setConnectionAttempt((attempt) => attempt + 1);
            }}
            aria-label="Reconnect call"
            className="rounded-full bg-muted p-3 text-foreground hover:bg-muted/80"
          >
            <RefreshCw className="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleEndCall}
          className="flex items-center gap-2 rounded-full bg-destructive px-6 py-3 font-semibold text-destructive-foreground shadow-lg transition-colors hover:bg-destructive/90"
        >
          <PhoneOff className="size-5" />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
