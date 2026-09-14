import type { Socket } from "socket.io-client";

/**
 * Proximity voice chat — a full WebRTC mesh between players, with volume
 * driven by how far apart the avatars are standing. See docs/adr/0008.
 *
 * This module deliberately knows nothing about Phaser. It takes the socket
 * (the signalling channel) and, once per tick, a map of peer positions.
 */

export type VoiceStatus =
  | "off"
  | "requesting"
  | "on"
  | "denied"
  | "nodevice"
  | "error";

export interface VoiceState {
  status: VoiceStatus;
  peers: number;
}

type SignalData = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type Peer = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  /** Candidates that arrived before setRemoteDescription — see onSignal */
  pending: RTCIceCandidateInit[];
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ],
};

/** Full volume within this radius (an NPC is interactable at 120) */
const NEAR = 150;
/** Inaudible past this — about a quarter of the 1920px room */
const FAR = 550;

/** Both sides run this, so exactly one of a pair sends the offer. */
const isCaller = (myId: string, peerId: string) => myId < peerId;

export default class VoiceChat {
  private peers = new Map<string, Peer>();
  private stream: MediaStream | null = null;
  private status: VoiceStatus = "off";

  constructor(private socket: Socket) {
    socket.on("voice-peers", this.onPeers);
    socket.on("voice-peer-join", this.onPeerJoin);
    socket.on("voice-peer-leave", this.onPeerLeave);
    socket.on("voice-signal", this.onSignal);
  }

  isEnabled() {
    return this.status === "on" || this.status === "requesting";
  }

  async enable() {
    if (this.isEnabled()) return;
    this.setStatus("requesting");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      console.error("[voice] getUserMedia failed:", name, err);
      this.setStatus(
        name === "NotAllowedError"
          ? "denied"
          : name === "NotFoundError"
            ? "nodevice"
            : "error",
      );
      return;
    }
    this.setStatus("on");
    this.socket.emit("voice-join");
  }

  disable() {
    const wasOn = this.isEnabled();
    this.peers.forEach((_, id) => this.removePeer(id));
    // Stopping the tracks is what turns the browser's recording dot off
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (wasOn) this.socket.emit("voice-leave");
    this.setStatus("off");
  }

  /**
   * A reconnect hands us a fresh socket id, so every peer id on both sides is
   * stale. Drop them all and re-announce — the mic stream survives, so the
   * user is not asked for permission a second time.
   */
  resetOnReconnect() {
    if (!this.isEnabled()) return;
    this.peers.forEach((_, id) => this.removePeer(id));
    this.socket.emit("voice-join");
    this.emitState();
  }

  /** Louder the closer the avatars stand. Called on a throttle, not per frame. */
  updateVolumes(px: number, py: number, remotes: Map<string, { x: number; y: number }>) {
    this.peers.forEach(({ audio }, peerId) => {
      const rp = remotes.get(peerId);
      if (!rp) {
        // Connected but their sprite has not spawned yet. Full volume: a wrong
        // volume is debuggable, silence just looks like voice is broken.
        audio.volume = 1;
        return;
      }
      const d = Math.hypot(px - rp.x, py - rp.y);
      const t = Math.min(1, Math.max(0, (FAR - d) / (FAR - NEAR)));
      audio.volume = t * t; // squared tracks perceived loudness better than linear
    });
  }

  destroy() {
    this.disable();
    this.socket.off("voice-peers", this.onPeers);
    this.socket.off("voice-peer-join", this.onPeerJoin);
    this.socket.off("voice-peer-leave", this.onPeerLeave);
    this.socket.off("voice-signal", this.onSignal);
  }

  removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peer.audio.srcObject = null;
    peer.audio.remove();
    this.peers.delete(peerId);
    this.emitState();
  }

  // --- signalling ---------------------------------------------------------

  private onPeers = ({ ids }: { ids: string[] }) => {
    if (!this.stream) return;
    const me = this.socket.id ?? "";
    ids.forEach((id) => this.ensurePeer(id, isCaller(me, id)));
  };

  private onPeerJoin = ({ id }: { id: string }) => {
    if (!this.stream) return;
    const me = this.socket.id ?? "";
    this.ensurePeer(id, isCaller(me, id));
  };

  private onPeerLeave = ({ id }: { id: string }) => this.removePeer(id);

  private onSignal = async ({ from, data }: { from: string; data: SignalData }) => {
    if (!this.stream) return;
    // An offer can land before we processed the join that announced them
    const peer = this.ensurePeer(from, false);
    if (!peer) return;
    const { pc } = peer;
    try {
      if (data.sdp?.type === "offer") {
        await pc.setRemoteDescription(data.sdp);
        await this.flushPending(peer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signal(from, { sdp: pc.localDescription! });
      } else if (data.sdp?.type === "answer") {
        await pc.setRemoteDescription(data.sdp);
        await this.flushPending(peer);
      } else if (data.candidate) {
        // Trickled candidates routinely beat the answer. Dropping them costs
        // connectivity, so hold them until the remote description lands.
        if (pc.remoteDescription) {
          await pc
            .addIceCandidate(data.candidate)
            .catch((e) => console.warn("[voice] addIceCandidate failed", e));
        } else {
          peer.pending.push(data.candidate);
        }
      }
    } catch (err) {
      console.error("[voice] signal failed from", from, err);
    }
  };

  private async flushPending(peer: Peer) {
    for (const c of peer.pending) {
      await peer.pc.addIceCandidate(c).catch(() => {});
    }
    peer.pending.length = 0;
  }

  private signal(to: string, data: SignalData) {
    this.socket.emit("voice-signal", { to, data });
  }

  private ensurePeer(peerId: string, caller: boolean): Peer | null {
    const existing = this.peers.get(peerId);
    if (existing) return existing;
    if (!this.stream) return null;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream!));

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.volume = 0; // silent until the first updateVolumes() places them
    document.body.appendChild(audio);

    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
      audio.play().catch((err) => console.warn("[voice] autoplay blocked", err));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(peerId, { candidate: e.candidate.toJSON() });
    };
    // One negotiation per pair, ever — the track set never changes after the
    // offer. If this fires, an assumption of this design has broken.
    pc.onnegotiationneeded = () => {
      if (pc.signalingState !== "stable") return;
      console.warn("[voice] unexpected renegotiation for", peerId);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        console.warn("[voice] peer", peerId, pc.connectionState);
        this.removePeer(peerId);
      }
    };

    const peer: Peer = { pc, audio, pending: [] };
    this.peers.set(peerId, peer);
    this.emitState();

    if (caller) void this.makeOffer(peerId, pc);
    return peer;
  }

  private async makeOffer(peerId: string, pc: RTCPeerConnection) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signal(peerId, { sdp: pc.localDescription! });
    } catch (err) {
      console.error("[voice] offer failed for", peerId, err);
    }
  }

  // --- React bridge (ADR 0003: window CustomEvents are the only seam) ------

  private setStatus(status: VoiceStatus) {
    this.status = status;
    this.emitState();
  }

  private emitState() {
    window.dispatchEvent(
      new CustomEvent<VoiceState>("voice-state", {
        detail: { status: this.status, peers: this.peers.size },
      }),
    );
  }
}
