const https = require("https");

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    jsonResponse(res, 405, { error: "Method not allowed" });
    return;
  }

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
  } catch (_error) {
    jsonResponse(res, 502, { error: "Failed to fetch prayer times" });
  }
};
