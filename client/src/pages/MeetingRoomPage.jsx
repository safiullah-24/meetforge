import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMeetingSocket, disconnectSocket } from '../services/socketService';

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function MeetingRoomPage() {
  const { meetingCode = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const meeting = location.state?.meeting || null;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Initializing meeting room...');
  const [roomError, setRoomError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);

  const normalizedMeetingCode = meetingCode.trim().toUpperCase();

  const attachRemoteStream = (stream) => {
    remoteStreamRef.current = stream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const resetRemoteStream = () => {
    remoteStreamRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          roomId: normalizedMeetingCode,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;

      if (stream) {
        attachRemoteStream(stream);
        setConnectionStatus('Connected to remote participant.');
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setConnectionStatus('Video connection established.');
      }

      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        setConnectionStatus('Connection lost. Waiting for reconnection...');
      }
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const flushPendingIceCandidates = async (peerConnection) => {
    const pendingCandidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of pendingCandidates) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('Failed to add queued ICE candidate:', error);
      }
    }
  };

  const addIceCandidate = async (candidateData) => {
    const peerConnection = createPeerConnection();
    const candidate = new RTCIceCandidate(candidateData);

    if (!peerConnection.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    await peerConnection.addIceCandidate(candidate);
  };

  const closePeerConnection = () => {
    pendingCandidatesRef.current = [];

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    resetRemoteStream();
  };

  const createOffer = async () => {
    const peerConnection = createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketRef.current?.emit('offer', {
      roomId: normalizedMeetingCode,
      offer,
    });

    setConnectionStatus('Offer sent. Waiting for remote answer...');
  };

  const handleOffer = async ({ offer } = {}) => {
    if (!offer) {
      return;
    }

    const peerConnection = createPeerConnection();
    await peerConnection.setRemoteDescription(offer);
    await flushPendingIceCandidates(peerConnection);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketRef.current?.emit('answer', {
      roomId: normalizedMeetingCode,
      answer,
    });

    setConnectionStatus('Answer sent. Connecting video...');
  };

  const handleAnswer = async ({ answer } = {}) => {
    if (!answer || !peerConnectionRef.current) {
      return;
    }

    await peerConnectionRef.current.setRemoteDescription(answer);
    await flushPendingIceCandidates(peerConnectionRef.current);
  };

  const handleUserJoined = async ({ user: joinedUser } = {}) => {
    if (joinedUser?.id === user?._id || joinedUser?.id === user?.id) {
      return;
    }

    setConnectionStatus('Another participant joined. Starting WebRTC negotiation...');
    await createOffer();
  };

  const handleUserLeft = () => {
    closePeerConnection();
    setConnectionStatus('Remote participant left the room.');
  };

  useEffect(() => {
    let active = true;

    const startMeeting = async () => {
      try {
        if (!normalizedMeetingCode) {
          throw new Error('Meeting code is missing from the room URL.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setCameraEnabled(true);
        setMicrophoneEnabled(true);

        const socket = createMeetingSocket({
          meetingCode: normalizedMeetingCode,
          token,
          user: {
            id: user?._id || user?.id,
            name: user?.name,
            email: user?.email,
          },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-room', {
            roomId: normalizedMeetingCode,
            user: {
              id: user?._id || user?.id,
              name: user?.name,
              email: user?.email,
            },
          });
          setConnectionStatus('Joined room. Waiting for another participant...');
        });

        socket.on('user-joined', handleUserJoined);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', async ({ candidate } = {}) => {
          if (!candidate) {
            return;
          }

          await addIceCandidate(candidate);
        });
        socket.on('user-left', handleUserLeft);
        socket.connect();
      } catch (error) {
        setRoomError(error.message || 'Failed to start the meeting room.');
        setConnectionStatus('Unable to initialize meeting room.');
      }
    };

    startMeeting();

    return () => {
      active = false;

      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId: normalizedMeetingCode });
      }

      disconnectSocket(socketRef.current);
      socketRef.current = null;

      closePeerConnection();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [normalizedMeetingCode, token, user]);

  const toggleTrack = (kind) => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const track = kind === 'video' ? stream.getVideoTracks()[0] : stream.getAudioTracks()[0];

    if (!track) {
      return;
    }

    track.enabled = !track.enabled;

    if (kind === 'video') {
      setCameraEnabled(track.enabled);
    } else {
      setMicrophoneEnabled(track.enabled);
    }
  };

  const handleLeaveRoom = async () => {
    setIsLeaving(true);

    try {
      socketRef.current?.emit('leave-room', { roomId: normalizedMeetingCode });
      disconnectSocket(socketRef.current);
      socketRef.current = null;
      closePeerConnection();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      navigate('/dashboard', { replace: true });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Meeting Room</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-100">
              {meeting?.title || 'Video call'}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Code: <span className="font-mono tracking-[0.24em] text-slate-100">{normalizedMeetingCode}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleTrack('video')}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              {cameraEnabled ? 'Camera On' : 'Camera Off'}
            </button>
            <button
              type="button"
              onClick={() => toggleTrack('audio')}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              {microphoneEnabled ? 'Mic On' : 'Mic Off'}
            </button>
            <button
              type="button"
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLeaving ? 'Leaving...' : 'Leave'}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-300">{connectionStatus}</p>
          {roomError && <p className="text-sm text-rose-300">{roomError}</p>}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">Local video</div>
            <video ref={localVideoRef} autoPlay playsInline muted className="aspect-video w-full bg-black object-cover" />
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">Remote video</div>
            <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full bg-black object-cover" />
          </section>
        </div>
      </div>
    </main>
  );
}