const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

function initGoogleClient(callback) {
  // Load gapi and gsi libraries
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.onload = () => {
    gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      gapiInited = true;
      if (callback) callback();
    });
  };
  document.body.appendChild(gapiScript);

  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.onload = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: ''
    });
    gisInited = true;
  };
  document.body.appendChild(gisScript);
}

function signIn(callback) {
  tokenClient.callback = async (resp) => {
    if (resp.error) {
      console.error(resp);
      return;
    }
    if (callback) callback();
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function signOut() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
}

async function fetchEventsForWeek(startDate, endDate) {
  const events = [];
  try {
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const items = response.result.items;
    items.forEach(item => {
      const start = item.start.dateTime || item.start.date;
      const end = item.end.dateTime || item.end.date;
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      const durationMinutes = (endDateObj - startDateObj) / 60000;
      events.push({
        id: item.id,
        title: item.summary || '(No title)',
        start: startDateObj,
        end: endDateObj,
        durationMinutes: durationMinutes,
        location: item.location || '',
        description: item.description || '',
        isAllDay: !item.start.dateTime,
        raw: item,
      });
    });
  } catch (error) {
    console.error('Error fetching events', error);
  }
  return events;
}

export { initGoogleClient, signIn, signOut, fetchEventsForWeek };
