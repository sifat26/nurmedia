const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'prayer-settings.json');

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readSettings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      mode: 'api',
      manualTimes: {
        Fajr: '04:30',
        Sunrise: '05:45',
        Dhuhr: '12:00',
        Asr: '16:15',
        Maghrib: '18:30',
        Isha: '19:45',
      },
      lastUpdated: null,
      updatedBy: 'system',
    };
  }
}

function writeSettings(settings) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

function validateTime(str) {
  return /^\d{1,2}:\d{2}$/.test(str);
}

module.exports = async function handler(req, res) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  // GET - return current settings (no auth required for reading mode)
  if (req.method === 'GET') {
    const settings = readSettings();
    jsonResponse(res, 200, settings);
    return;
  }

  // POST - update settings (auth required)
  if (req.method === 'POST') {
    // Parse body
    let body = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10000) {
          req.destroy();
        }
      });
      req.on('end', resolve);
    });

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      jsonResponse(res, 400, { error: 'Invalid JSON' });
      return;
    }

    // Verify admin password
    if (!data.password || data.password !== adminPassword) {
      jsonResponse(res, 401, { error: 'Invalid admin password' });
      return;
    }

    const settings = readSettings();

    // Update mode if provided
    if (data.mode && (data.mode === 'api' || data.mode === 'manual')) {
      settings.mode = data.mode;
    }

    // Update manual times if provided
    if (data.manualTimes && typeof data.manualTimes === 'object') {
      const prayerNames = [
        'Fajr',
        'Sunrise',
        'Dhuhr',
        'Asr',
        'Maghrib',
        'Isha',
      ];
      for (const name of prayerNames) {
        if (data.manualTimes[name]) {
          if (!validateTime(data.manualTimes[name])) {
            jsonResponse(res, 400, {
              error: `Invalid time format for ${name}. Use HH:MM`,
            });
            return;
          }
          settings.manualTimes[name] = data.manualTimes[name];
        }
      }
    }

    settings.lastUpdated = new Date().toISOString();
    settings.updatedBy = 'admin';

    writeSettings(settings);
    jsonResponse(res, 200, { success: true, settings });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  jsonResponse(res, 405, { error: 'Method not allowed' });
};
