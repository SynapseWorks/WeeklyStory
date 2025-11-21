let openaiApiKey = '';

export function setApiKey(key, persist = true) {
  openaiApiKey = key;
  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('openai_api_key', key);
    } catch (err) {
      console.error('Could not save API key to localStorage', err);
    }
  }
}

export function getApiKey() {
  if (openaiApiKey) return openaiApiKey;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('openai_api_key');
      if (saved) {
        openaiApiKey = saved;
        return openaiApiKey;
      }
    } catch (err) {
      console.error('Could not read API key from localStorage', err);
    }
  }
  return '';
}

export async function generateWeeklyStory(payload) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key is not set. Please enter your API key in the settings.');
  }
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4-1106-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant that helps summarize a person\'s weekly calendar data into a narrative. Your responses should be in JSON with the keys `weeklySummary`, `talkingPoints`, `topAchievements`, and `sneakyBadHabits`. Each value should be concise. Respond in a friendly, reflective tone.'
      },
      {
        role: 'user',
        content: JSON.stringify(payload)
      }
    ],
    temperature: 0.7,
    max_tokens: 700,
    response_format: { type: 'json_object' }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI API returned no content');
  }
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error('Could not parse JSON from OpenAI response', content);
    throw err;
  }
}
