const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3400);

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
};

function readRequestBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limitBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": mime[".json"] });
  res.end(JSON.stringify(payload));
}

function fetchJsonWithRedirects(urlString, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects from prayer API"));
      return;
    }

    const targetUrl = new URL(urlString);
    const request = https.request(
      {
        hostname: targetUrl.hostname,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: "GET",
        headers: {
          "User-Agent": "NurMediaPrayerClient/1.0",
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;

        if (
          [301, 302, 303, 307, 308].includes(statusCode) &&
          typeof location === "string"
        ) {
          const nextUrl = new URL(location, targetUrl).toString();
          fetchJsonWithRedirects(nextUrl, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Prayer API error (${statusCode}): ${data}`));
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Invalid prayer API response: ${err.message}`));
          }
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

function fetchPrayerTimesByCity({ city, country, method, school }) {
  return new Promise((resolve, reject) => {
    const endpoint = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${encodeURIComponent(String(method))}&school=${encodeURIComponent(String(school))}`;
    fetchJsonWithRedirects(endpoint).then(resolve).catch(reject);
  });
}

const FIXED_CITY = "Tangail";
const FIXED_COUNTRY = "Bangladesh";
const FIXED_METHOD = 3; // Muslim World League
const FIXED_SCHOOL = 0; // Shafi

function callOpenRouter(message, language) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      reject(new Error("Missing OPENROUTER_API_KEY"));
      return;
    }

    const languageInstruction =
      language === "bn"
        ? "Respond in Bangla."
        : language === "en"
          ? "Respond in English."
          : "If the user writes in Bangla, respond in Bangla; otherwise respond in English.";

    const payload = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openrouter/auto",
      messages: [
        {
          role: "system",
          content:
            "You are Nur Media Assistant for Nur Media Balla, Bangladesh. " +
            "Answer only Nur Media related questions: services, social channels, contact, and mission. " +
            "Known details: phone +8801712908124, email nurmediaballa23@gmail.com, location Mosjid Road, Balla Bazar, Bangladesh, services include Islamic media production, CC camera installation, and projector rental, channels include Facebook and YouTube @NurMediaBalla. " +
            "If asked something unrelated to Nur Media, politely say you can help only with Nur Media information. " +
            languageInstruction,
        },
        { role: "user", content: message },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const request = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "HTTP-Referer": process.env.SITE_URL || `http://localhost:${PORT}`,
          "X-Title": "Nur Media Chatbot",
        },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(
                `OpenRouter API error (${response.statusCode}): ${data}`,
              ),
            );
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const text =
              parsed?.choices?.[0]?.message?.content ||
              "Sorry, no answer was generated.";
            resolve(text);
          } catch (err) {
            reject(new Error(`Invalid OpenRouter response: ${err.message}`));
          }
        });
      },
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (method === "POST" && reqUrl.pathname === "/api/chatbot") {
    try {
      const rawBody = await readRequestBody(req);
      const body = JSON.parse(rawBody || "{}");
      const message = String(body.message || "").trim();
      const language = String(body.language || "auto");

      if (!message) {
        jsonResponse(res, 400, { error: "Message is required" });
        return;
      }

      const reply = await callOpenRouter(message, language);
      jsonResponse(res, 200, { reply });
      return;
    } catch (error) {
      console.error("/api/chatbot error:", error.message);
      const message = String(error?.message || "");

      if (message.includes("Missing OPENROUTER_API_KEY")) {
        jsonResponse(res, 503, {
          error:
            "Server is missing OPENROUTER_API_KEY. Create a .env file and add your OpenRouter key.",
        });
        return;
      }

      if (message.includes("OpenRouter API error (401)")) {
        jsonResponse(res, 502, {
          error:
            "OpenRouter rejected the API key. Please check OPENROUTER_API_KEY.",
        });
        return;
      }

      jsonResponse(res, 500, {
        error: "Failed to generate chatbot response",
      });
      return;
    }
  }

  if (method === "GET" && reqUrl.pathname === "/api/health") {
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && reqUrl.pathname === "/api/prayer-times") {
    try {
      const apiData = await fetchPrayerTimesByCity({
        city: FIXED_CITY,
        country: FIXED_COUNTRY,
        method: FIXED_METHOD,
        school: FIXED_SCHOOL,
      });

      const timings = apiData?.data?.timings || {};
      const date = apiData?.data?.date || {};
      const meta = apiData?.data?.meta || {};

      jsonResponse(res, 200, {
        location: `${FIXED_CITY}, ${FIXED_COUNTRY}`,
        timezone: meta.timezone || "Asia/Dhaka",
        gregorianDate: date?.gregorian?.date || "",
        hijriDate: date?.hijri?.date || "",
        calculationMethod: "Muslim World League",
        schoolLabel: FIXED_SCHOOL === 1 ? "Hanafi" : "Shafi",
        timings: {
          Fajr: timings.Fajr,
          Sunrise: timings.Sunrise,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha,
        },
      });
      return;
    } catch (error) {
      console.error("/api/prayer-times error:", error.message);
      jsonResponse(res, 502, {
        error: "Failed to fetch prayer times",
      });
      return;
    }
  }

  const requestedPath =
    reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname;
  const safePath = path
    .normalize(requestedPath)
    .replace(/^([.]{2}[\\/])+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
    });
    res.end(data);
  });
});

function startServer(preferredPort) {
  server.listen(preferredPort, () => {
    console.log(`Server running at http://localhost:${preferredPort}`);
  });
}

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE" && PORT !== 8080) {
    console.warn(`Port ${PORT} is busy. Falling back to http://localhost:8080`);
    startServer(8080);
    return;
  }

  throw error;
});

startServer(PORT);
