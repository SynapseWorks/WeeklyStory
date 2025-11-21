# WeeklyStory

WeeklyStory is a static web application that turns your weekly calendar into a narrative. By connecting to your Google Calendar, you can tag events, mark achievements, and view summaries and AI‑generated talking points about your week.

## Features

- **Calendar integration** – Connects to your primary Google Calendar using OAuth and reads your events for a selected week.
- **Tagging & notes** – Assign categories (e.g., Work, Family, Creative) and optional notes to each event.
- **Achievements & suggestions** – Mark events as achievements and use simple heuristics to suggest potential achievements.
- **Weekly stats** – See how much time you spent in each category and other metrics.
- **AI‑generated summaries** – Use OpenAI’s Chat Completion API to generate a narrative summary, conversation starters, and gentle observations about your habits.

## Getting started

### Clone the repository

```bash
git clone https://github.com/<your-username>/WeeklyStory.git
cd WeeklyStory
```

### Install dev dependencies and run tests

This project uses a simple test runner to validate the core logic. Install dependencies and run the tests:

```bash
npm install
npm test
```

### Serve the app locally

The web application is entirely static and lives in the `docs/` folder. To run it locally, you can use any static file server. For example:

```bash
npx serve docs
```

Open your browser at `http://localhost:3000` (or the port printed by the server).

## Google API configuration

To read your Google Calendar, you need to set up a Google Cloud project and enable the Calendar API. Create an OAuth 2.0 client ID for a **Web application** and obtain an API key. Follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project.
3. Enable the **Google Calendar API** for your project.
4. In **APIs & Services → Credentials**, create an **API key**.
5. Still under **Credentials**, create an **OAuth client ID** (application type: *Web application*). Add your GitHub Pages URL (e.g. `https://<your-username>.github.io`) and `http://localhost:3000` as *Authorized JavaScript origins*. You do not need an authorized redirect URI for implicit flow.
6. Note the `client_id` and `api_key`. In `docs/js/calendarApi.js`, replace the placeholders `YOUR_GOOGLE_CLIENT_ID_HERE` and `YOUR_GOOGLE_API_KEY_HERE` with these values.

The application uses Google’s [client library for JavaScript](https://apis.google.com/js/api.js).  The sample code in Google’s quickstart shows how to initialize the client with an API key and load the calendar API by calling `gapi.client.init`【11886609167011†L370-L399】.  It also uses the scope `https://www.googleapis.com/auth/calendar.readonly`【11886609167011†L370-L399】 to request read-only access.

## OpenAI configuration

WeeklyStory uses OpenAI’s Chat Completions API on the client side to generate summaries and talking points. To use this feature:

1. Obtain an OpenAI API key from [platform.openai.com](https://platform.openai.com).
2. Launch the application and open the **Settings** dialog.
3. Paste your API key and choose whether to store it in `localStorage` (only on your device). The key is never sent anywhere except to OpenAI’s API.

You can select the model and adjust the prompt in `docs/js/llmClient.js`.

## Security & privacy notes

- The app runs entirely in your browser. Event data is only fetched from Google and processed locally; nothing is sent to any server except Google and OpenAI.
- The app only requests the `calendar.readonly` scope【11886609167011†L370-L399】.
- No data is persisted to any backend; if you refresh the page, your tags and notes will reset.

## Deployment

GitHub Pages is configured to serve the site from the `docs/` directory. After pushing to the `main` branch, your site will be available at:

```
https://<your-username>.github.io/WeeklyStory/
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
