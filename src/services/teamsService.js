import { createClient } from '@supabase/supabase-js';
import { getValidToken } from './microsoftAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const GRAPH = 'https://graph.microsoft.com/v1.0';
const STATIC_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";

async function graphRequest(userId, path, options = {}) {
  const targetUserId = userId || STATIC_ADMIN_USER_ID;
  const token = await getValidToken(targetUserId);

  if (token === 'mock-demo-token-12345') {
    if (path.includes('/me/onlineMeetings') && options.method === 'POST') {
      return {
        id: `teams-mock-${Date.now()}`,
        joinUrl: `https://teams.microsoft.com/l/meetup-join/mock-meeting-${Date.now()}`,
      };
    }
    if (path.includes('/recordings')) {
      return {
        value: [{
          recordingContentUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        }]
      };
    }
    if (path.includes('/transcripts') && !path.includes('/content')) {
      return {
        value: [{ id: 'mock-transcript-id-5678' }]
      };
    }
    return null;
  }

  const res = await fetch(`${GRAPH}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (res.status === 403) throw new Error('PERMISSION_DENIED');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Graph API error: ${res.status}`);

  return res.status === 204 ? null : res.json();
}

export async function createTeamsMeeting(userId, interviewId, { subject, startTime, endTime, attendeeEmails }) {
  const targetUserId = userId || STATIC_ADMIN_USER_ID;
  const meeting = await graphRequest(targetUserId, '/me/onlineMeetings', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      startDateTime: startTime,
      endDateTime: endTime,
      participants: {
        attendees: attendeeEmails.map(email => ({
          upn: email,
          role: 'attendee',
        })),
      },
    }),
  });

  if (!meeting || !meeting.id) {
    throw new Error('Failed to create online meeting via Microsoft Graph');
  }

  // Save to Supabase interviews table
  if (interviewId) {
    const { error } = await supabase
      .from('interviews')
      .update({
        teams_meeting_id: meeting.id,
        teams_join_url: meeting.joinUrl,
        teams_start_time: startTime,
        teams_end_time: endTime,
      })
      .eq('id', interviewId);

    if (error) throw new Error('Failed to save meeting to Supabase: ' + error.message);
  }
  return meeting;
}

export async function fetchRecording(userId, interviewId, meetingId) {
  const targetUserId = userId || STATIC_ADMIN_USER_ID;
  const data = await graphRequest(targetUserId, `/me/onlineMeetings/${meetingId}/recordings`);

  if (!data || !data.value?.length) {
    return { status: 'not_available', message: 'Recording not yet available. Check back 15–30 minutes after the meeting ends.' };
  }

  const recording = data.value[0];
  const { error } = await supabase
    .from('interviews')
    .update({
      teams_recording_url: recording.recordingContentUrl,
      teams_recording_status: 'available',
    })
    .eq('id', interviewId);

  if (error) throw new Error('Failed to update recording status: ' + error.message);

  return { status: 'available', recordingUrl: recording.recordingContentUrl };
}

export async function fetchTranscript(userId, interviewId, meetingId) {
  const targetUserId = userId || STATIC_ADMIN_USER_ID;
  const token = await getValidToken(targetUserId);

  let transcriptText = "";
  let transcriptId = "mock-transcript-id-5678";

  if (token === 'mock-demo-token-12345') {
    transcriptText = `WEBVTT

00:01.000 --> 00:08.000
John Doe: Hi, thank you for joining the interview today. Could you tell us about your experience with React and Next.js?

00:09.000 --> 00:25.000
Candidate: Hi, sure! I have 4 years of experience building responsive React applications. Recently, I've been using Next.js App Router for server-side rendering, SEO optimization, and static exports. I really like its performance.

00:26.000 --> 00:32.000
Sarah Smith: That sounds great. How do you manage global state across complex dashboard pages?

00:33.000 --> 00:50.000
Candidate: I prefer using Zustand for lightweight and fast state updates. For more complex enterprise-level features, I combine it with React Context or standard Redux Toolkit.

00:51.000 --> 00:58.000
John Doe: Excellent. We are very impressed with your coding speed and communication skills. Thank you!`;
  } else {
    // Step 1: Get transcript list
    const list = await graphRequest(targetUserId, `/me/onlineMeetings/${meetingId}/transcripts`);
    if (!list || !list.value?.length) {
      return { status: 'not_available', message: 'No transcript found. Ensure transcription was enabled in Teams before the meeting started.' };
    }

    // Step 2: Get transcript content
    transcriptId = list.value[0].id;
    const contentRes = await fetch(
      `${GRAPH}/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!contentRes.ok) {
      throw new Error(`Failed to download WebVTT transcript: ${contentRes.status}`);
    }
    
    transcriptText = await contentRes.text();
  }

  // Save to Supabase
  const { error } = await supabase
    .from('interviews')
    .update({
      teams_transcript_id: transcriptId,
      teams_transcript_text: transcriptText,
      teams_transcript_fetched_at: new Date().toISOString(),
    })
    .eq('id', interviewId);

  if (error) throw new Error('Failed to save transcript to Supabase: ' + error.message);

  return { status: 'available', transcript: transcriptText, transcriptId };
}
