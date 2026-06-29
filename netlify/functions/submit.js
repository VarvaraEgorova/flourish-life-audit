exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const sliderSummary = Object.entries(data.energySliders || {})
    .map(([key, val]) => `  ${key}: ${val > 0 ? "+" : ""}${val}`)
    .join("\n");

  const allocSummary = Object.entries(data.allocation || {})
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => `  ${key}: ${val}%`)
    .join("\n");

  const emailBody = `
NEW LIFE AUDIT SUBMISSION
=========================

CONTACT
-------
Email: ${data.email}
Wants a call: ${data.wantsCall ? "YES — follow up to book" : "No"}

ENERGY SNAPSHOT
---------------
What's been giving her energy:
${data.energising}

What's been draining her:
${data.draining}

Morning feeling: ${data.morning}

What occupies her mind:
${data.mindOccupied}

Sleep: ${data.sleep}

ENERGY MAP (sliders -5 draining to +5 energising)
--------------------------------------------------
${sliderSummary}

ENERGY ALLOCATION
-----------------
${allocSummary}

Most draining area: ${data.mostDraining}
Most energising area: ${data.mostEnergising}

TRUTH LAYER
-----------
When she felt most like herself:
${data.mostLikeMyself}

What she's been tolerating:
${data.tolerating}

What she senses needs to change:
${data.senseChange}

AI REFLECTION GENERATED FOR HER
--------------------------------
${data.aiOutput}

=========================
Flourish Studio Life Audit
  `.trim();

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Flourish Studio Audit <onboarding@resend.dev>",
      to: ["egorova.varvara@yahoo.com"],
      subject: `New Life Audit — ${data.email}${data.wantsCall ? " — WANTS A CALL" : ""}`,
      text: emailBody,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend error:", error);
    return { statusCode: 500, body: "Email failed" };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
