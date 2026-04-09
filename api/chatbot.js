const https = require("https");

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

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
          "HTTP-Referer":
            process.env.SITE_URL || "https://your-vercel-domain.vercel.app",
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
              parsed &&
              parsed.choices &&
              parsed.choices[0] &&
              parsed.choices[0].message
                ? parsed.choices[0].message.content
                : "Sorry, no answer was generated.";
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    jsonResponse(res, 405, { error: "Method not allowed" });
    return;
  }

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
  } catch (error) {
    const msg = String(error && error.message ? error.message : "");

    if (msg.includes("Missing OPENROUTER_API_KEY")) {
      jsonResponse(res, 503, {
        error:
          "Server is missing OPENROUTER_API_KEY. Add it in Vercel Environment Variables.",
      });
      return;
    }

    if (msg.includes("OpenRouter API error (401)")) {
      jsonResponse(res, 502, {
        error:
          "OpenRouter rejected the API key. Please verify OPENROUTER_API_KEY in Vercel.",
      });
      return;
    }

    jsonResponse(res, 500, { error: "Failed to generate chatbot response" });
  }
};
