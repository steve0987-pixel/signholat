import React, { useEffect, useMemo, useState } from "react";
import LocationPickerMap from "../components/LocationPickerMap";
import { CATEGORIES } from "../constants/options";
import { useI18n } from "../i18n/LanguageProvider";
import { requestDuplicateCheck, requestTitleSummary } from "../services/ai";
import { findNearbyObjects, findNearbyReports } from "../utils/enrichReport";
import {
  extractCoordinatesFromLocationInput,
  normalizeLocationInput,
  reverseGeocodePlaceName,
  suggestPlaceNameFromLocation
} from "../utils/locationAssist";

function buildPreviewKey({ category, description, placeName }, language) {
  return [language, category, description.trim(), placeName.trim()].join("|");
}

function toLinkedObject(placeName, nearbyObjects) {
  if (placeName) {
    return { name: placeName };
  }

  const nearbyObject = nearbyObjects?.[0];
  if (!nearbyObject) return null;

  return {
    name: nearbyObject.name,
    type: nearbyObject.source
  };
}

function summarizeNearbyReports(candidateReports = []) {
  return candidateReports.map((report) => ({
    id: report.id,
    category: report.category,
    placeName: report.placeName || "",
    summary: report.summary || "",
    description: report.description || "",
    location: report.location || "",
    status: report.status || "Submitted",
    distance: report.distance ?? null
  }));
}

function findDuplicateCandidates(payload, parsedLocation, reports = []) {
  if (parsedLocation) {
    return findNearbyReports(parsedLocation.lat, parsedLocation.lng, reports, 400);
  }

  const descriptionText = payload.description.toLowerCase();
  const placeNameText = payload.placeName.toLowerCase();

  return reports
    .filter((report) => {
      if (!report?.id) return false;
      if (report.category === payload.category) return true;
      if (placeNameText && String(report.placeName || "").toLowerCase().includes(placeNameText)) return true;
      if (!descriptionText) return false;

      return descriptionText
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .some((word) => String(report.description || "").toLowerCase().includes(word));
    })
    .slice(0, 6);
}

function shouldShowClarifiedDescription(rawDescription, clarifiedDescription) {
  const raw = String(rawDescription || "").trim();
  const clarified = String(clarifiedDescription || "").trim();
  if (!raw || !clarified) return false;
  if (raw === clarified) return false;

  const normalizeForCompare = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[.,!?;:()[\]{}"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  if (normalizeForCompare(raw) === normalizeForCompare(clarified)) return false;

  return raw.length >= 24;
}

function getAiErrorLabel(errorCode) {
  const code = String(errorCode || "");

  switch (code) {
    case "config_missing":
      return "AI is in fallback mode: GROQ_API_KEY is missing on server.";
    case "timeout":
      return "AI timeout: server switched to fallback mode.";
    case "request_failed":
      return "AI request failed: fallback mode is active.";
    case "network_error":
    case "endpoint_unavailable":
      return "AI endpoint is unavailable right now, using fallback mode.";
    default:
      return code ? `Fallback reason: ${code}` : "Fallback mode is active.";
  }
}

export default function SubmitPage({ geoAsrData, onSubmit, onConfirmExistingIssue, reports = [] }) {
  const { getCategoryLabel, language, t } = useI18n();
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    description: "",
    location: "",
    placeName: "",
    mediaFile: null,
    mediaUrl: "",
    mediaType: "image"
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [autoSuggestedPlaceName, setAutoSuggestedPlaceName] = useState("");
  const [duplicateState, setDuplicateState] = useState(null);

  useEffect(() => {
    return () => {
      if (form.mediaUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(form.mediaUrl);
      }
    };
  }, [form.mediaUrl]);

  const canSubmit = useMemo(() => {
    return Boolean(form.category && form.description.trim() && form.location.trim() && form.placeName.trim() && form.mediaUrl);
  }, [form]);

  const previewKey = useMemo(() => buildPreviewKey(form, language), [form, language]);

  useEffect(() => {
    const description = form.description.trim();
    if (description.length < 18) {
      setAiPreview(null);
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setAiPreview((prev) => ({
        ...(prev || {}),
        loading: true,
        sourceKey: previewKey
      }));

      const result = await requestTitleSummary({
        language,
        category: form.category,
        description,
        linkedObject: form.placeName.trim() ? { name: form.placeName.trim() } : null
      });

      if (!active) return;

      setAiPreview({
        ...result,
        loading: false,
        sourceKey: previewKey
      });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [form.category, form.description, form.placeName, language, previewKey]);

  useEffect(() => {
    const rawLocation = form.location.trim();
    if (!rawLocation) return;
    let cancelled = false;

    const normalizedLocation = normalizeLocationInput(rawLocation);
    const suggestedPlaceName = suggestPlaceNameFromLocation(normalizedLocation || rawLocation, geoAsrData);

    setForm((prev) => {
      let next = prev;

      if (normalizedLocation && normalizedLocation !== prev.location) {
        next = { ...next, location: normalizedLocation };
      }

      const currentPlace = prev.placeName.trim();
      const canAutofillPlace = !currentPlace || currentPlace === autoSuggestedPlaceName;
      if (suggestedPlaceName && canAutofillPlace && currentPlace !== suggestedPlaceName) {
        next = next === prev ? { ...next } : next;
        next.placeName = suggestedPlaceName;
      }

      return next;
    });

    if (suggestedPlaceName) {
      setAutoSuggestedPlaceName(suggestedPlaceName);
    } else if (autoSuggestedPlaceName) {
      setAutoSuggestedPlaceName("");
    }

    if (suggestedPlaceName) {
      return () => {
        cancelled = true;
      };
    }

    const coords = extractCoordinatesFromLocationInput(normalizedLocation || rawLocation);
    if (!coords) {
      return () => {
        cancelled = true;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      const reversePlaceName = await reverseGeocodePlaceName(coords.lat, coords.lng, language);
      if (cancelled || !reversePlaceName) return;

      setForm((prev) => {
        const currentPlace = prev.placeName.trim();
        const canAutofillPlace = !currentPlace || currentPlace === autoSuggestedPlaceName;
        if (!canAutofillPlace || currentPlace === reversePlaceName) return prev;

        return {
          ...prev,
          placeName: reversePlaceName
        };
      });

      setAutoSuggestedPlaceName(reversePlaceName);
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [autoSuggestedPlaceName, form.location, geoAsrData, language]);

  const updateField = (field, value) => {
    setDuplicateState(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (form.mediaUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(form.mediaUrl);
    }

    const mediaUrl = URL.createObjectURL(file);
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    updateField("mediaFile", file);
    updateField("mediaUrl", mediaUrl);
    updateField("mediaType", mediaType);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError(t("submission.geolocationUnsupported"));
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateField("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        setError(t("submission.geolocationUnavailable"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    if (form.mediaUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(form.mediaUrl);
    }

    setForm({
      category: CATEGORIES[0],
      description: "",
      location: "",
      placeName: "",
      mediaFile: null,
      mediaUrl: "",
      mediaType: "image"
    });
    setAutoSuggestedPlaceName("");
    setAiPreview(null);
    setDuplicateState(null);
  };

  const finalizeSubmit = async (payload) => {
    const result = await Promise.resolve(onSubmit(payload));
    resetForm();
    setSuccessMessage(t("submission.success", { xp: result?.xpGained || 0 }));
  };

  const buildSubmissionPayload = async () => {
    const description = form.description.trim();
    const placeName = form.placeName.trim();
    const payload = {
      category: form.category,
      description,
      location: form.location.trim(),
      placeName,
      mediaFile: form.mediaFile,
      mediaUrl: form.mediaUrl,
      mediaType: form.mediaType
    };

    const normalizedLocation = normalizeLocationInput(payload.location);
    const parsedLocation = extractCoordinatesFromLocationInput(normalizedLocation || payload.location);
    const nearbyObjects = parsedLocation ? findNearbyObjects(parsedLocation.lat, parsedLocation.lng, geoAsrData) : [];
    const linkedObject = toLinkedObject(placeName, nearbyObjects);
    const preview =
      aiPreview?.sourceKey === previewKey && aiPreview?.summary
        ? aiPreview
        : await requestTitleSummary({
            language,
            category: payload.category,
            description: payload.description,
            linkedObject
          });

    const nearbyExistingReports = summarizeNearbyReports(findDuplicateCandidates(payload, parsedLocation, reports));

    return {
      payload: {
        ...payload,
        location: normalizedLocation || payload.location,
        aiTitle: preview.aiTitle || "",
        summary: preview.summary || payload.description
      },
      duplicateInput: {
        language,
        category: payload.category,
        description: payload.description,
        coordinates: parsedLocation,
        linkedObject,
        nearbyExistingReports
      }
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setError("");

    if (!canSubmit) {
      setError(t("submission.incompleteError"));
      return;
    }

    setSubmitting(true);

    try {
      const { payload, duplicateInput } = await buildSubmissionPayload();
      const duplicateResult = await requestDuplicateCheck(duplicateInput);

      if (duplicateResult.isDuplicate) {
        setDuplicateState({
          duplicateResult,
          pendingPayload: payload
        });
        return;
      }

      await finalizeSubmit(payload);
    } catch {
      setError("Unable to save the report right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const matchedReport = useMemo(() => {
    if (!duplicateState?.duplicateResult?.matchedIssueId) return null;

    return reports.find((report) => String(report.id) === String(duplicateState.duplicateResult.matchedIssueId)) || null;
  }, [duplicateState, reports]);

  return (
    <section className="tab-page">
      <header className="page-header">
        <h1>{t("submission.title")}</h1>
        <p>{t("submission.subtitle")}</p>
      </header>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="submission-flow-strip">
          <span>1. Report issue</span>
          <span>2. Community confirms</span>
          <span>3. Public status updates</span>
        </div>

        <div className="submission-trust-card">
          <strong>Transparent civic process</strong>
          <p>Your report stays publicly visible, receives human review, and contributes to local service accountability.</p>
        </div>

        <label>
          {t("submission.category")}
          <select value={form.category} onChange={(e) => updateField("category", e.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {getCategoryLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("submission.media")}
          <input type="file" accept="image/*,video/*" capture="environment" onChange={handleMediaChange} />
        </label>

        {form.mediaUrl && form.mediaType === "image" ? (
          <img className="upload-preview" src={form.mediaUrl} alt={t("submission.uploadPreview")} />
        ) : null}

        {form.mediaUrl && form.mediaType === "video" ? (
          <video className="upload-preview" src={form.mediaUrl} controls playsInline preload="metadata" />
        ) : null}

        <label>
          {t("submission.description")}
          <textarea
            placeholder={t("submission.descriptionPlaceholder")}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
          />
        </label>

        {aiPreview?.loading || aiPreview?.summary ? (
          <div className="ai-assist-card" aria-live="polite">
            <div className="ai-assist-header">
              <strong>AI assistant preview</strong>
              <span>{aiPreview?.loading ? "Preparing..." : aiPreview?.fallbackUsed ? "Fallback mode" : "Ready"}</span>
            </div>
            {aiPreview?.loading ? (
              <p className="ai-assist-copy">Generating a clean issue title and summary for public cards.</p>
            ) : (
              <>
                <strong className="ai-assist-title">{aiPreview.aiTitle}</strong>
                <p className="ai-assist-copy">{aiPreview.summary}</p>
                {aiPreview?.fallbackUsed ? <p className="ai-assist-copy">{getAiErrorLabel(aiPreview.aiError)}</p> : null}
                {shouldShowClarifiedDescription(form.description, aiPreview.clarifiedDescription) ? (
                  <div className="ai-description-refine">
                    <strong>Clear description</strong>
                    <p>{aiPreview.clarifiedDescription}</p>
                    <button
                      type="button"
                      className="secondary-btn small-action"
                      onClick={() => updateField("description", aiPreview.clarifiedDescription)}
                    >
                      Use this description
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <label>
          {t("submission.placeName")}
          <input
            type="text"
            placeholder={t("submission.placeNamePlaceholder")}
            value={form.placeName}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (autoSuggestedPlaceName && nextValue.trim() !== autoSuggestedPlaceName) {
                setAutoSuggestedPlaceName("");
              }
              updateField("placeName", nextValue);
            }}
          />
        </label>

        <label>
          {t("submission.location")}
          <input
            type="text"
            placeholder={t("submission.locationPlaceholder")}
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
          />
        </label>

        <LocationPickerMap
          locationValue={form.location}
          onSelect={(lat, lng) => updateField("location", `${lat.toFixed(6)}, ${lng.toFixed(6)}`)}
          disabled={submitting}
        />

        {autoSuggestedPlaceName ? (
          <p className="map-hint">Object name was auto-detected from location: {autoSuggestedPlaceName}</p>
        ) : null}

        {duplicateState?.duplicateResult ? (
          <div className="ai-duplicate-card" role="alert">
            <strong>Possible duplicate report nearby</strong>
            <p>{duplicateState.duplicateResult.reason}</p>
            <p>
              Confidence: {Math.round((duplicateState.duplicateResult.confidence || 0) * 100)}%
              {matchedReport ? ` - Existing issue: ${matchedReport.aiTitle || matchedReport.placeName || matchedReport.id}` : ""}
            </p>
            <div className="ai-duplicate-actions">
              <button type="button" className="secondary-btn" onClick={() => setDuplicateState(null)} disabled={submitting}>
                Edit report
              </button>
              {duplicateState.duplicateResult.matchedIssueId && onConfirmExistingIssue ? (
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    setError("");

                    try {
                      const result = await onConfirmExistingIssue(duplicateState.duplicateResult.matchedIssueId);
                      if (!result?.ok) {
                        setError(result?.message || "Unable to confirm existing issue.");
                        return;
                      }

                      setSuccessMessage("Existing issue confirmed. Thank you for community validation.");
                      setDuplicateState(null);
                      resetForm();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  Confirm existing issue
                </button>
              ) : null}
              <button
                type="button"
                className="primary-btn"
                onClick={async () => {
                  if (!duplicateState?.pendingPayload) return;

                  setSubmitting(true);
                  setError("");

                  try {
                    await finalizeSubmit(duplicateState.pendingPayload);
                  } catch {
                    setError("Unable to save the report right now. Please try again.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
              >
                Create new report anyway
              </button>
            </div>
          </div>
        ) : null}

        <button className="secondary-btn" type="button" onClick={handleGetLocation} disabled={locating || submitting}>
          {locating ? t("submission.locating") : t("submission.geolocate")}
        </button>

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : t("submission.submit")}
        </button>

        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}
      </form>
    </section>
  );
}
