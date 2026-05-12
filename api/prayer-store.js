const https = require('https');

const DEFAULT_SETTINGS = {
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

function jsonbinRequest(method, binId, apiKey, data) {
  return new Promise((resolve, reject) => {
    const headers = {
      'X-Master-Key': apiKey,
      'Content-Type': 'application/json',
      'X-Bin-Meta': 'false',
    };

    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${binId}${method === 'GET' ? '/latest' : ''}`,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch {
          reject(new Error('Invalid JSONBin response'));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function readSettings() {
  const binId = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    return DEFAULT_SETTINGS;
  }

  try {
    const data = await jsonbinRequest('GET', binId, apiKey);
    return data || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings) {
  const binId = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    throw new Error('JSONBIN_BIN_ID and JSONBIN_API_KEY are required');
  }

  return jsonbinRequest('PUT', binId, apiKey, settings);
}

module.exports = { readSettings, writeSettings, DEFAULT_SETTINGS };
