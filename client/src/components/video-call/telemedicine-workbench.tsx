"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserRound } from "lucide-react";

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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        };
        const pc = new RTCPeerConnection(configuration);
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Handle incoming tracks (remote video)
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsConnected(true);
          }
        };

        const sendOffer = async () => {
          if (!peerConnectionRef.current) return;
          try {
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socket.emit("webrtc:offer", { appointmentId, offer });
          } catch (e) {
            console.error("Error creating offer", e);
          }
        };

        // Only the Doctor initiates offers to prevent WebRTC glare (collisions)
        if (isDoctor) {
          pc.onnegotiationneeded = () => {
            sendOffer();
          };
        } else {
          pc.onnegotiationneeded = () => {
            // Patient waits for the doctor's offer
          };
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc:ice_candidate", { appointmentId, candidate: event.candidate });
          }
        };

        socket.on("webrtc:offer", async ({ offer }) => {
          if (!peerConnectionRef.current) return;
          if (isDoctor) return; // Doctor NEVER processes offers, only sends them

          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.emit("webrtc:answer", { appointmentId, answer });
          } catch (e) {
            console.error("Error handling offer:", e);
          }
        });

        socket.on("webrtc:answer", async ({ answer }) => {
          if (!peerConnectionRef.current) return;
          if (!isDoctor) return; // Patient NEVER processes answers, only sends them

          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.error("Error handling answer:", e);
          }
        });

        socket.on("webrtc:ice_candidate", async ({ candidate }) => {
          if (!peerConnectionRef.current) return;
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            // This can fail gracefully if candidates arrive before remote description is set
            console.warn("Ignoring ICE candidate error:", (e as Error).message);
          }
        });

        socket.on("webrtc:user_joined", () => {
          // If a new user joins, and we are the Doctor, we send an offer to them
          if (isDoctor) {
            sendOffer();
          }
        });

        socket.on("webrtc:user_left", () => {
          setIsConnected(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        // Join the room
        socket.emit("webrtc:join_call", appointmentId);

      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    startCall();

    return () => {
      socket.off("webrtc:user_joined");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice_candidate");
      socket.off("webrtc:user_left");
      
      socket.emit("webrtc:leave_call", appointmentId);

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [appointmentId]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    const socket = getSocket();
    socket.emit("webrtc:leave_call", appointmentId);
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    onEndCall();
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden rounded-2xl border border-border/40 shadow-sm min-h-125">
      {/* Video Grid */}
      <div className="flex-1 relative bg-black/5 flex items-center justify-center p-4">
        
        {/* Remote Video (Main) */}
        {isConnected ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover rounded-xl shadow-lg border border-border/20"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground animate-pulse">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
               <UserRound className="size-10 text-muted-foreground/50" />
            </div>
            <p className="font-mono text-sm tracking-wider uppercase">Waiting for {isDoctor ? "patient" : "doctor"}...</p>
          </div>
        )}

        {/* Local Video (PiP) */}
        <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-3/4 bg-card border-2 border-border/50 rounded-xl overflow-hidden shadow-2xl z-10 transition-transform hover:scale-105">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <VideoOff className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-card/80 backdrop-blur-md border-t border-border/40 flex items-center justify-center gap-4 px-6 z-20">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all ${isMuted ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button 
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
        >
          {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
        </button>
        <button 
          onClick={handleEndCall}
          className="p-4 px-8 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
        >
          <PhoneOff className="size-5" />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
