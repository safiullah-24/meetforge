import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMeetingSocket, disconnectSocket } from '../services/socketService';

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const getUserId = (user) => user?._id || user?.id || '';

const toSocketUser = (user) => ({
  id: getUserId(user),
  name: user?.name || 'Participant',
  email: user?.email,
});

const getDeviceMessage = (error) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Device permission was denied. You can continue with the available media.';
  }

  if (error?.name === 'NotReadableError' || error?.name === 'AbortError') {
    return 'A camera or microphone is already in use or unavailable. You can continue with the available media.';
  }

  return 'Camera or microphone is unavailable. You can continue without that device.';
};

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export default function MeetingRoomPage() {
  const { meetingCode = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const meeting = location.state?.meeting || null;
  const normalizedMeetingCode = meetingCode.trim().toUpperCase();
  const currentUser = toSocketUser(user);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const activeRef = useRef(false);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [availableDevices, setAvailableDevices] = useState({ video: false, audio: false });
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Starting meeting room...');
  const [roomError, setRoomError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    activeRef.current = true;
    let socket;

    const setLocalStream = (stream) => {
      localStreamRef.current = stream;
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      setAvailableDevices({ video: hasVideo, audio: hasAudio });
      setCameraEnabled(hasVideo && stream.getVideoTracks()[0].enabled);
      setMicrophoneEnabled(hasAudio && stream.getAudioTracks()[0].enabled);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    const requestMedia = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera and microphone access.');
      }

      const tracks = [];
      const errors = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        tracks.push(...stream.getTracks());
      } catch (error) {
        errors.push(error);
      }

      if (!tracks.some((track) => track.kind === 'video')) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tracks.push(...videoStream.getVideoTracks());
        } catch (error) {
          errors.push(error);
        }
      }

      if (!tracks.some((track) => track.kind === 'audio')) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tracks.push(...audioStream.getAudioTracks());
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length) {
        setRoomError(
          tracks.length
            ? getDeviceMessage(errors[errors.length - 1])
            : 'Camera and microphone are unavailable. You can still join the meeting and wait for another participant.'
        );
      }

      setLocalStream(new MediaStream(tracks));
    };

    const resetRemoteStream = () => {
      remoteStreamRef.current = null;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };

    const closePeerConnection = () => {
      pendingCandidatesRef.current = [];
      if (peerConnectionRef.current) {
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      resetRemoteStream();
    };

    const createPeerConnection = () => {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      const peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socketRef.current?.emit('ice-candidate', {
            roomId: normalizedMeetingCode,
            candidate,
          });
        }
      };
      peerConnection.ontrack = ({ streams }) => {
        const [stream] = streams;
        if (stream) {
          remoteStreamRef.current = stream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          setConnectionStatus('Connected to participant.');
        }
      };
      peerConnection.onconnectionstatechange = () => {
        if (!activeRef.current) return;
        const state = peerConnection.connectionState;
        if (state === 'connected') setConnectionStatus('Connected to participant.');
        if (state === 'connecting') setConnectionStatus('Connecting to participant...');
        if (state === 'disconnected') setConnectionStatus('Connection interrupted. Waiting for reconnection...');
        if (state === 'failed') setConnectionStatus('Connection failed. Waiting for participant...');
      };
      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'failed') {
          setConnectionStatus('Network connection failed. Waiting for participant...');
        }
      };
      localStreamRef.current?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
      peerConnectionRef.current = peerConnection;
      return peerConnection;
    };

    const flushPendingCandidates = async (peerConnection) => {
      const candidates = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const candidate of candidates) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error('Failed to add queued ICE candidate:', error);
        }
      }
    };

    const handleOffer = async ({ offer } = {}) => {
      if (!offer || !activeRef.current) return;
      try {
        const peerConnection = createPeerConnection();
        await peerConnection.setRemoteDescription(offer);
        await flushPendingCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socketRef.current?.emit('answer', { roomId: normalizedMeetingCode, answer });
        setConnectionStatus('Connecting to participant...');
      } catch (error) {
        console.error('Failed to handle WebRTC offer:', error);
        setConnectionStatus('Could not negotiate the video connection.');
      }
    };

    const handleAnswer = async ({ answer } = {}) => {
      if (!answer || !peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(answer);
        await flushPendingCandidates(peerConnectionRef.current);
      } catch (error) {
        console.error('Failed to handle WebRTC answer:', error);
      }
    };

    const handleCandidate = async ({ candidate } = {}) => {
      if (!candidate || !activeRef.current) return;
      try {
        const peerConnection = createPeerConnection();
        const iceCandidate = new RTCIceCandidate(candidate);
        if (!peerConnection.remoteDescription) {
          pendingCandidatesRef.current.push(iceCandidate);
        } else {
          await peerConnection.addIceCandidate(iceCandidate);
        }
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    };

    const createOffer = async () => {
      try {
        const peerConnection = createPeerConnection();
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketRef.current?.emit('offer', { roomId: normalizedMeetingCode, offer });
        setConnectionStatus('Connecting to participant...');
      } catch (error) {
        console.error('Failed to create WebRTC offer:', error);
        setConnectionStatus('Could not start the video connection.');
      }
    };

    const handleUserJoined = async ({ user: joinedUser } = {}) => {
      if (joinedUser?.id === currentUser.id) return;
      setRemoteParticipant(joinedUser || { name: 'Participant' });
      closePeerConnection();
      await createOffer();
    };

    const handleUserLeft = () => {
      closePeerConnection();
      setRemoteParticipant(null);
      setConnectionStatus('Participant left. Waiting for someone to join...');
    };

    const startMeeting = async () => {
      try {
        if (!normalizedMeetingCode) throw new Error('Meeting code is missing from the room URL.');
        await requestMedia();
        if (!active) return;

        socket = createMeetingSocket({
          meetingCode: normalizedMeetingCode,
          token,
          user: currentUser,
        });
        socketRef.current = socket;
        socket.on('connect', () => {
          socket.emit('join-room', { roomId: normalizedMeetingCode, user: currentUser });
          setConnectionStatus('Connected to room. Waiting for participant...');
        });
        socket.on('connect_error', () => {
          setConnectionStatus('Unable to connect to meeting server. Retrying...');
        });
        socket.on('user-joined', handleUserJoined);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleCandidate);
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
      activeRef.current = false;
      socket?.emit('leave-room', { roomId: normalizedMeetingCode });
      disconnectSocket(socket);
      socketRef.current = null;
      closePeerConnection();
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
    };
  }, [normalizedMeetingCode, token, currentUser.id, currentUser.name, currentUser.email]);

  const toggleTrack = (kind) => {
    const track = localStreamRef.current?.getTracks().find((item) => item.kind === kind);
    if (!track) {
      setRoomError(kind === 'video' ? 'No camera is available.' : 'No microphone is available.');
      return;
    }
    track.enabled = !track.enabled;
    if (kind === 'video') setCameraEnabled(track.enabled);
    if (kind === 'audio') setMicrophoneEnabled(track.enabled);
  };

  const handleLeaveRoom = () => {
    setIsLeaving(true);
    socketRef.current?.emit('leave-room', { roomId: normalizedMeetingCode });
    disconnectSocket(socketRef.current);
    socketRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    navigate('/dashboard', { replace: true });
  };

  const localName = `${currentUser.name} (You)`;
  const remoteName = remoteParticipant?.name || 'Waiting for participant';

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <header className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Meeting Room</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-100">{meeting?.title || 'Video call'}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Code: <span className="font-mono tracking-[0.24em] text-slate-200">{normalizedMeetingCode}</span>
            </p>
          </div>
          <p className="text-sm font-medium text-slate-300">{connectionStatus}</p>
        </header>

        <div className="p-4 sm:p-6">
          {roomError && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {roomError}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`aspect-video w-full object-cover ${availableDevices.video && cameraEnabled ? '' : 'hidden'}`}
              />
              {(!availableDevices.video || !cameraEnabled) && (
                <div className="flex aspect-video w-full flex-col items-center justify-center bg-slate-800 text-slate-300">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span>Camera is off</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-slate-950/75 px-4 py-3 text-sm font-medium text-slate-100">{localName}</div>
            </section>

            <section className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              {remoteStreamRef.current ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center bg-slate-800 text-slate-400">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold">
                    {remoteName.charAt(0).toUpperCase()}
                  </div>
                  <span>{remoteParticipant ? 'Connecting...' : 'Waiting for participant...'}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-slate-950/75 px-4 py-3 text-sm font-medium text-slate-100">{remoteName}</div>
            </section>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <button type="button" onClick={() => toggleTrack('video')} className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800">
              {cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
            </button>
            <button type="button" onClick={() => toggleTrack('audio')} className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800">
              {microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
            </button>
            <button type="button" onClick={handleLeaveRoom} disabled={isLeaving} className="rounded-lg bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isLeaving ? 'Leaving...' : 'Leave meeting'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
