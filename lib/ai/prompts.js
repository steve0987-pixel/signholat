function normalizeLanguage(language) {
  return ["en", "ru", "uz"].includes(language) ? language : "en";
}

function getPromptLanguageLabel(language) {
  switch (normalizeLanguage(language)) {
    case "ru":
      return "Russian";
    case "uz":
      return "Uzbek";
    default:
      return "English";
  }
}

function stringifyPayload(value) {
  return JSON.stringify(value, null, 2);
}

export function buildDuplicateCheckPrompt(input = {}) {
  const promptLanguage = getPromptLanguageLabel(input.language);

  return `
You are helping a civic-tech reporting app.
Respond in ${promptLanguage}.
Return JSON only. No markdown. No explanation outside JSON.

Schema:
{
  "isDuplicate": boolean,
  "matchedIssueId": string | null,
  "confidence": number,
  "reason": string,
  "suggestedAction": "confirm_existing" | "create_new"
}

Rules:
- Compare meaning, not exact wording.
- Use nearby location and linked object context.
- Only mark duplicate when it is likely the same real-world issue.
- Keep the reason short and explainable.
- If unsure, prefer create_new with lower confidence.

New report:
${stringifyPayload({
  category: input.category || "",
  description: input.description || "",
  coordinates: input.coordinates || null,
  linkedObject: input.linkedObject || null
})}

Nearby existing reports:
${stringifyPayload(input.nearbyExistingReports || [])}
  `.trim();
}

export function buildTitleSummaryPrompt(input = {}) {
  const promptLanguage = getPromptLanguageLabel(input.language);

  return `
You are helping a civic-tech reporting app create short UI copy.
Respond in ${promptLanguage}.
Return JSON only. No markdown.

Schema:
{
  "aiTitle": string,
  "summary": string,
  "clarifiedDescription": string
}

Rules:
- Keep both outputs concise and practical.
- aiTitle must be a short clean issue title suitable for a card.
- summary must be one short sentence.
- clarifiedDescription must rewrite the user text in clear, simple language (1-2 short sentences).
- Fix obvious typos and grammar where needed.
- Keep factual meaning unchanged. Do not invent facts.
- Avoid robotic phrasing and avoid extra adjectives.

Input:
${stringifyPayload({
  category: input.category || "",
  description: input.description || "",
  linkedObject: input.linkedObject || null
})}
  `.trim();
}

export function buildPriorityExplanationPrompt(input = {}) {
  const promptLanguage = getPromptLanguageLabel(input.language);

  return `
You are helping a civic-tech app explain issue priority to users.
Respond in ${promptLanguage}.
Return JSON only. No markdown.

Schema:
{
  "priorityExplanation": string
}

Rules:
- Keep it human-readable, practical, and short.
- Do not sound robotic or overly dramatic.
- Mention the strongest reasons only.

Input:
${stringifyPayload({
  category: input.category || "",
  summary: input.summary || "",
  severity: input.severity || "",
  linkedObjectType: input.linkedObjectType || "",
  repeatedIssueCount: input.repeatedIssueCount || 0,
  confirmationsCount: input.confirmationsCount || 0,
  statusAgeHours: input.statusAgeHours || 0
})}
  `.trim();
}

export function buildOnboardingAssistantPrompt(input = {}) {
  const promptLanguage = getPromptLanguageLabel(input.language);

  return `
You are an onboarding assistant for a civic-tech Telegram Mini App called "Real Holat Pulse".
Respond in ${promptLanguage}.
Return JSON only. No markdown.

Schema:
{
  "answer": string,
  "suggestedNextStep": string
}

Rules:
- Help new users understand how to use the app quickly.
- Keep answer practical, trustworthy, and short (2-4 short sentences).
- Explain only what the app actually does: submit issue, view map, open issue/object details, confirm issues, track statuses.
- Do not invent unavailable features.
- Do not sound like a chatbot or marketing bot.
- suggestedNextStep must be one short action the user can do now.

Context:
${stringifyPayload({
  appName: "Real Holat Pulse",
  sections: ["Submission", "Dashboard", "Profile", "Issue detail", "Object detail"],
  statusFlow: ["Submitted", "Under Review", "Verified", "In Progress", "Resolved"],
  question: input.question || "",
  currentTab: input.currentTab || "dashboard"
})}
  `.trim();
}
