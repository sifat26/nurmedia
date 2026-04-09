# Nur Media Website + Bilingual Chatbot

This project now includes a Nur Media chatbot that can answer in both English and Bangla.

## Features

- Bilingual chatbot UI (English + Bangla)
- Secure server-side OpenRouter API integration
- Language mode switcher: `Auto`, `English`, `বাংলা`
- Quick prompt buttons for common user questions

## Setup

1. Create a `.env` file from `.env.example`.
2. Add your OpenRouter key in `.env`:

```env
OPENROUTER_API_KEY=your_real_key_here
OPENROUTER_MODEL=openrouter/auto
SITE_URL=http://localhost:3400
```

3. Start the server:

```bash
node server.js
```

4. Open:

`http://localhost:3400`

## API Endpoints

- `POST /api/chatbot` - Send `{ message, language }`
- `GET /api/health` - Health check

## Important Security Note

Never put your OpenRouter API key in frontend files like `index.html` or `script.js`.
Keep it in `.env` only.
