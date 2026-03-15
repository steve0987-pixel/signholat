import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import { requestOnboardingAssistant } from "../services/ai";

function getCopy(language) {
  if (language === "ru") {
    return {
      title: "AI помощник для новых пользователей",
      subtitle: "Коротко объяснит, как пользоваться приложением.",
      open: "Открыть помощник",
      close: "Скрыть",
      placeholder: "Например: как отправить первое обращение?",
      ask: "Спросить",
      quick: ["Как отправить обращение?", "Как подтверждать существующую проблему?", "Как отслеживать статус?"],
      loading: "AI готовит ответ...",
      fallback: "Показан резервный ответ.",
      nextStep: "Следующий шаг"
    };
  }

  if (language === "uz") {
    return {
      title: "Yangi foydalanuvchilar uchun AI yordamchi",
      subtitle: "Ilovadan qanday foydalanishni qisqa tushuntiradi.",
      open: "Yordamchini ochish",
      close: "Yopish",
      placeholder: "Masalan: birinchi murojaatni qanday yuboraman?",
      ask: "So'rash",
      quick: ["Murojaatni qanday yuboraman?", "Mavjud muammoni qanday tasdiqlayman?", "Statusni qanday kuzataman?"],
      loading: "AI javob tayyorlamoqda...",
      fallback: "Zaxira javob ko'rsatildi.",
      nextStep: "Keyingi qadam"
    };
  }

  return {
    title: "AI onboarding assistant",
    subtitle: "Explains how to use the app in a few short steps.",
    open: "Open assistant",
    close: "Hide",
    placeholder: "For example: how do I submit my first report?",
    ask: "Ask",
    quick: ["How do I submit a report?", "How do I confirm an existing issue?", "How do I track status updates?"],
    loading: "AI is preparing an answer...",
    fallback: "Fallback answer shown.",
    nextStep: "Next step"
  };
}

export default function OnboardingAssistant({ currentTab = "dashboard" }) {
  const { language } = useI18n();
  const copy = useMemo(() => getCopy(language), [language]);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState({
    loading: false,
    answer: "",
    suggestedNextStep: "",
    fallbackUsed: false
  });

  const askAssistant = async (inputQuestion) => {
    const normalizedQuestion = String(inputQuestion || "").trim();
    if (normalizedQuestion.length < 3) return;

    setState((prev) => ({ ...prev, loading: true }));

    const result = await requestOnboardingAssistant({
      language,
      question: normalizedQuestion,
      currentTab
    });

    setState({
      loading: false,
      answer: result.answer || "",
      suggestedNextStep: result.suggestedNextStep || "",
      fallbackUsed: Boolean(result.fallbackUsed)
    });
  };

  return (
    <section className="panel" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <strong style={{ fontSize: 14 }}>{copy.title}</strong>
          <p className="map-hint" style={{ marginTop: 4 }}>
            {copy.subtitle}
          </p>
        </div>
        <button type="button" className="secondary-btn small-action" onClick={() => setOpen((prev) => !prev)}>
          {open ? copy.close : copy.open}
        </button>
      </div>

      {open ? (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {copy.quick.map((quickQuestion) => (
              <button
                key={quickQuestion}
                type="button"
                className="source-chip"
                onClick={() => {
                  setQuestion(quickQuestion);
                  void askAssistant(quickQuestion);
                }}
              >
                {quickQuestion}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <textarea
              rows={2}
              value={question}
              placeholder={copy.placeholder}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              type="button"
              className="primary-btn small-action"
              onClick={() => void askAssistant(question)}
              disabled={state.loading}
            >
              {state.loading ? copy.loading : copy.ask}
            </button>
          </div>

          {state.answer ? (
            <div className="ai-priority-panel" style={{ marginTop: 4 }}>
              <p className="ai-priority-copy">{state.answer}</p>
              {state.suggestedNextStep ? (
                <p className="map-hint">
                  <strong>{copy.nextStep}:</strong> {state.suggestedNextStep}
                </p>
              ) : null}
              {state.fallbackUsed ? <p className="map-hint">{copy.fallback}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
