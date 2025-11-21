import { initGoogleClient, signIn, signOut, fetchEventsForWeek } from './calendarApi.js';
import { normalizeEvents, suggestAchievements, calculateWeeklyStats, buildLlmPayload } from './summaryCore.js';
import { setApiKey, getApiKey, generateWeeklyStory } from './llmClient.js';

const CATEGORIES = [
  'Work',
  'School / Study',
  'Family',
  'Health / Movement',
  'Creative / Projects',
  'Admin / Errands',
  'Social / Community',
  'Rest / Self-care',
  'Other',
];

let currentWeekStart = getMonday(new Date());
let events = [];
let signedIn = false;
let stats = null;

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(d) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function updateWeekDisplay() {
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  const range = `${formatDate(currentWeekStart)} \u2013 ${formatDate(end)}`;
  document.getElementById('current-week').textContent = range;
}

async function loadWeekEvents() {
  if (!signedIn) return;
  const start = new Date(currentWeekStart);
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 7);
  try {
    const raw = await fetchEventsForWeek(start, end);
    events = normalizeEvents(raw);
    events.forEach(ev => {
      ev.tags = [];
      ev.notes = '';
      ev.isAchievement = false;
      ev.isSuggestedAchievement = false;
    });
    const suggestions = suggestAchievements(events);
    events.forEach(ev => {
      if (suggestions.includes(ev.id)) ev.isSuggestedAchievement = true;
    });
    renderEvents();
    updateStats();
  } catch (err) {
    console.error(err);
    alert('Failed to load events: ' + err.message);
  }
}

function renderEvents() {
  const listEl = document.getElementById('events-list');
  listEl.innerHTML = '';
  const sorted = [...events].sort((a, b) => a.start - b.start);
  let lastDate = null;
  sorted.forEach(ev => {
    const dateStr = ev.start.toDateString();
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      const dayHeader = document.createElement('h3');
      dayHeader.textContent = formatDate(ev.start);
      listEl.appendChild(dayHeader);
    }
    const card = document.createElement('div');
    card.className = 'event-card';
    const info = document.createElement('div');
    info.innerHTML = `<strong>${ev.title}</strong> <span class="time">${formatTime(ev.start)} \u2013 ${formatTime(ev.end)}</span>${ev.location ? ' @ ' + ev.location : ''}`;
    card.appendChild(info);
    const tagSelect = document.createElement('select');
    tagSelect.multiple = true;
    tagSelect.className = 'tag-select';
    CATEGORIES.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (ev.tags.includes(cat)) option.selected = true;
      tagSelect.appendChild(option);
    });
    tagSelect.addEventListener('change', () => {
      ev.tags = Array.from(tagSelect.selectedOptions).map(o => o.value);
      updateStats();
    });
    card.appendChild(tagSelect);
    const achLabel = document.createElement('label');
    const achBox = document.createElement('input');
    achBox.type = 'checkbox';
    achBox.checked = ev.isAchievement;
    achBox.addEventListener('change', () => {
      ev.isAchievement = achBox.checked;
      updateStats();
    });
    achLabel.appendChild(achBox);
    achLabel.appendChild(document.createTextNode(' Achievement'));
    if (ev.isSuggestedAchievement) {
      const sugg = document.createElement('span');
      sugg.textContent = '★';
      sugg.title = 'Suggested achievement';
      sugg.className = 'suggested-indicator';
      achLabel.appendChild(sugg);
    }
    card.appendChild(achLabel);
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.placeholder = 'Notes...';
    noteInput.value = ev.notes;
    noteInput.addEventListener('input', () => {
      ev.notes = noteInput.value;
    });
    card.appendChild(noteInput);
    listEl.appendChild(card);
  });
}

function updateStats() {
  stats = calculateWeeklyStats(events);
  const statsContainer = document.getElementById('stats-container');
  statsContainer.innerHTML = '';
  const table = document.createElement('table');
  for (const cat in stats.hours) {
    const row = document.createElement('tr');
    const cellName = document.createElement('td');
    cellName.textContent = cat;
    const cellHours = document.createElement('td');
    cellHours.textContent = stats.hours[cat].toFixed(1) + 'h';
    row.appendChild(cellName);
    row.appendChild(cellHours);
    table.appendChild(row);
  }
  statsContainer.appendChild(table);
  const summary = document.createElement('p');
  summary.textContent = `${stats.achievements} achievements, ${stats.suggested} suggested`;
  statsContainer.appendChild(summary);
  if (stats.metrics.lateNightCount > 0) {
    const warn = document.createElement('p');
    warn.textContent = `Late night events: ${stats.metrics.lateNightCount}`;
    statsContainer.appendChild(warn);
  }
  if (stats.metrics.noHealthOrRest) {
    const warn2 = document.createElement('p');
    warn2.textContent = 'No Rest or Health events this week';
    statsContainer.appendChild(warn2);
  }
}

async function handleGenerate() {
  if (!stats) {
    alert('No stats available to generate story');
    return;
  }
  try {
    const payload = buildLlmPayload(events, stats);
    const result = await generateWeeklyStory(payload);
    if (result) {
      document.getElementById('weekly-summary').textContent = result.weeklySummary || '';
      const tpList = document.getElementById('talking-points');
      tpList.innerHTML = '';
      (result.talkingPoints || []).forEach(tp => {
        const li = document.createElement('li');
        li.textContent = tp;
        tpList.appendChild(li);
      });
      const badList = document.getElementById('bad-habits');
      badList.innerHTML = '';
      (result.sneakyBadHabits || []).forEach(bh => {
        const li = document.createElement('li');
        li.textContent = bh;
        badList.appendChild(li);
      });
    }
  } catch (err) {
    console.error(err);
    alert('Failed to generate story: ' + err.message);
  }
}

function setupEventListeners() {
  document.getElementById('google-signin').addEventListener('click', async () => {
    try {
      await signIn();
      signedIn = true;
      toggleAuthButtons();
      await loadWeekEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to sign in: ' + err.message);
    }
  });
  document.getElementById('google-signout').addEventListener('click', async () => {
    try {
      await signOut();
    } finally {
      signedIn = false;
      events = [];
      stats = null;
      document.getElementById('events-list').innerHTML = '';
      document.getElementById('stats-container').innerHTML = '';
      document.getElementById('weekly-summary').innerHTML = '';
      document.getElementById('talking-points').innerHTML = '';
      document.getElementById('bad-habits').innerHTML = '';
      toggleAuthButtons();
    }
  });
  document.getElementById('prev-week').addEventListener('click', async () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekDisplay();
    await loadWeekEvents();
  });
  document.getElementById('next-week').addEventListener('click', async () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekDisplay();
    await loadWeekEvents();
  });
  document.getElementById('generate-story').addEventListener('click', handleGenerate);
  const settingsBtn = document.getElementById('settings-button');
  const modal = document.getElementById('settings-modal');
  const saveBtn = document.getElementById('save-openai-key');
  const closeBtn = document.getElementById('close-settings');
  settingsBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    document.getElementById('openai-key').value = getApiKey() || '';
  });
  saveBtn.addEventListener('click', () => {
    const key = document.getElementById('openai-key').value.trim();
    setApiKey(key, true);
    modal.classList.add('hidden');
  });
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

function toggleAuthButtons() {
  document.getElementById('google-signin').classList.toggle('hidden', signedIn);
  document.getElementById('google-signout').classList.toggle('hidden', !signedIn);
}

async function init() {
  updateWeekDisplay();
  toggleAuthButtons();
  setupEventListeners();
  try {
    await initGoogleClient();
  } catch (err) {
    console.error('Failed to initialize Google API', err);
  }
}

window.addEventListener('DOMContentLoaded', init);
