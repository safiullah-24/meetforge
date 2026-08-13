import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMeeting, getMyMeetings, joinMeeting } from '../services/meetingService';

const formatDate = (dateValue) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue));

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdMeeting, setCreatedMeeting] = useState(null);

  const inviteBaseUrl = useMemo(() => window.location.origin, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get('join') || params.get('meetingCode');

    if (codeFromUrl) {
      setMeetingCode(codeFromUrl.toUpperCase());
    }
  }, [location.search]);

  const buildInviteLink = (code) => `${inviteBaseUrl}/dashboard?join=${code}`;

  const copyToClipboard = async (value, label) => {
    await navigator.clipboard.writeText(value);
    setSuccessMessage(`${label} copied to clipboard.`);
  };

  const loadMeetings = async () => {
    setLoadingMeetings(true);

    try {
      const response = await getMyMeetings(token);
      setMeetings(response.meetings || []);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load meetings.');
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const validateCreateForm = () => {
    const errors = {};

    if (meetingTitle.length > 120) {
      errors.title = 'Meeting title must be 120 characters or fewer.';
    }

    setFieldErrors((current) => ({ ...current, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const validateJoinForm = () => {
    const normalizedCode = meetingCode.trim().toUpperCase();
    const errors = {};

    if (!normalizedCode) {
      errors.code = 'Meeting code is required.';
    } else if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      errors.code = 'Meeting code must be 8 uppercase letters or numbers.';
    }

    setFieldErrors((current) => ({ ...current, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleCreateMeeting = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateCreateForm()) {
      return;
    }

    setCreatingMeeting(true);

    try {
      const response = await createMeeting(token, { title: meetingTitle.trim() });
      setCreatedMeeting(response.meeting);
      setMeetingTitle('');
      setSuccessMessage('Meeting created successfully.');
      await loadMeetings();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to create meeting.');
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleJoinMeeting = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateJoinForm()) {
      return;
    }

    setJoiningMeeting(true);

    try {
      const response = await joinMeeting(token, { meetingCode: meetingCode.trim().toUpperCase() });
      navigate(`/meeting/${response.meeting.meetingCode}`, {
        state: { meeting: response.meeting },
      });
      await loadMeetings();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to join meeting.');
    } finally {
      setJoiningMeeting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
              <p className="mt-2 text-slate-300">Create or join meetings and review your meeting history.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
              <p>
                <span className="font-semibold text-slate-100">Name:</span> {user?.name || 'N/A'}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-100">Email:</span> {user?.email || 'N/A'}
              </p>
            </div>
          </div>

          {(errorMessage || successMessage) && (
            <div className="mt-6 space-y-3">
              {errorMessage && (
                <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {successMessage}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <form onSubmit={handleCreateMeeting} className="rounded-xl border border-slate-800 bg-slate-950 p-5" noValidate>
              <h2 className="text-lg font-semibold text-slate-100">Create Meeting</h2>
              <label htmlFor="meetingTitle" className="mt-4 block text-sm font-medium text-slate-200">
                Meeting title
              </label>
              <input
                id="meetingTitle"
                type="text"
                value={meetingTitle}
                onChange={(event) => setMeetingTitle(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-500 transition focus:ring-2"
                placeholder="Optional meeting title"
                maxLength={120}
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-rose-300">{fieldErrors.title}</p>}

              <button
                type="submit"
                disabled={creatingMeeting}
                className="mt-5 w-full rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingMeeting ? 'Creating...' : 'Create Meeting'}
              </button>

              {createdMeeting && (
                <div className="mt-5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <p className="text-sm font-semibold text-cyan-200">Meeting created</p>
                  <p className="mt-2 text-sm text-slate-100">
                    Code: <span className="font-mono font-semibold tracking-[0.24em]">{createdMeeting.meetingCode}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/meeting/${createdMeeting.meetingCode}`, { state: { meeting: createdMeeting } })}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      Open Room
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdMeeting.meetingCode, 'Meeting code')}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      Copy Meeting Code
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(buildInviteLink(createdMeeting.meetingCode), 'Invite link')}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      Copy Invite Link
                    </button>
                  </div>
                </div>
              )}
            </form>

            <form onSubmit={handleJoinMeeting} className="rounded-xl border border-slate-800 bg-slate-950 p-5" noValidate>
              <h2 className="text-lg font-semibold text-slate-100">Join Meeting</h2>
              <label htmlFor="meetingCode" className="mt-4 block text-sm font-medium text-slate-200">
                Meeting code
              </label>
              <input
                id="meetingCode"
                type="text"
                value={meetingCode}
                onChange={(event) => setMeetingCode(event.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono tracking-[0.24em] text-slate-100 outline-none ring-cyan-500 transition focus:ring-2"
                placeholder="ABCDEFGH"
                maxLength={8}
              />
              {fieldErrors.code && <p className="mt-1 text-xs text-rose-300">{fieldErrors.code}</p>}

              <button
                type="submit"
                disabled={joiningMeeting}
                className="mt-5 w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joiningMeeting ? 'Joining...' : 'Join Meeting'}
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Meeting History</h2>
              <p className="mt-2 text-sm text-slate-300">Meetings you hosted or joined appear here.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loadingMeetings && <p className="text-sm text-slate-300">Loading meetings...</p>}

            {!loadingMeetings && meetings.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-300">
                No meetings yet. Create or join a meeting to see it here.
              </div>
            )}

            {!loadingMeetings &&
              meetings.map((meeting) => (
                <article key={meeting.id} className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        {meeting.title || 'Untitled meeting'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-300">
                        Code: <span className="font-mono tracking-[0.2em] text-slate-100">{meeting.meetingCode}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-300">Host: {meeting.host?.name || 'N/A'}</p>
                      <p className="mt-1 text-sm text-slate-300">Created: {formatDate(meeting.createdAt)}</p>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                      {meeting.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(meeting.meetingCode, 'Meeting code')}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      Copy Code
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(buildInviteLink(meeting.meetingCode), 'Invite link')}
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      Copy Invite Link
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
