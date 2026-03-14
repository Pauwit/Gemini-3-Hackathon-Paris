'use strict';

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.resolve(__dirname, '../memory/meetings-store.json');

function defaultStore() {
  return {
    meetings: [],
    documentsByMeeting: {},
    cardsByMeeting: {},
    transcriptByMeeting: {},
    updatedAt: null,
  };
}

function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStore() {
  ensureStoreDir();

  if (!fs.existsSync(STORE_PATH)) {
    return defaultStore();
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultStore(),
      ...parsed,
    };
  } catch {
    return defaultStore();
  }
}

function saveStore(store) {
  ensureStoreDir();
  const payload = {
    ...defaultStore(),
    ...store,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

function computeDurationMinutes(startedAt, stoppedAt) {
  if (!startedAt || !stoppedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(stoppedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.max(1, Math.round((end - start) / 60000));
}

function upsertMeetingRecord({
  meetingId,
  title,
  participants,
  startedAt,
  stoppedAt,
  cards,
  transcript,
  documents,
}) {
  if (!meetingId) return;

  const store = loadStore();

  const nextMeeting = {
    id: meetingId,
    title: title || 'Untitled Meeting',
    date: stoppedAt || startedAt || new Date().toISOString(),
    duration: computeDurationMinutes(startedAt, stoppedAt),
    participants: Array.isArray(participants) ? participants : [],
    cardCount: Array.isArray(cards) ? cards.length : 0,
    documentCount: Array.isArray(documents) ? documents.length : 0,
  };

  const meetingIndex = store.meetings.findIndex((item) => item.id === meetingId);
  if (meetingIndex >= 0) {
    store.meetings[meetingIndex] = nextMeeting;
  } else {
    store.meetings.push(nextMeeting);
  }

  store.meetings = store.meetings
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  store.documentsByMeeting[meetingId] = Array.isArray(documents) ? documents : [];
  store.cardsByMeeting[meetingId] = Array.isArray(cards) ? cards : [];
  store.transcriptByMeeting[meetingId] = Array.isArray(transcript) ? transcript : [];

  saveStore(store);
}

function getMeetings() {
  return loadStore().meetings || [];
}

function getMeetingDocuments(meetingId) {
  const store = loadStore();
  return store.documentsByMeeting?.[meetingId] || [];
}

function getMeetingCards(meetingId) {
  const store = loadStore();
  return store.cardsByMeeting?.[meetingId] || [];
}

function getMeetingTranscript(meetingId) {
  const store = loadStore();
  return store.transcriptByMeeting?.[meetingId] || [];
}

module.exports = {
  upsertMeetingRecord,
  getMeetings,
  getMeetingDocuments,
  getMeetingCards,
  getMeetingTranscript,
};
