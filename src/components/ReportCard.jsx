import React, { useMemo, useState } from "react";

import { useI18n } from "../i18n/LanguageProvider";
import { requestPriorityExplanation } from "../services/ai";
import { calculateDistanceMeters, parseReportLatLng } from "../utils/enrichReport";
import { formatDateTime, shortText, statusToTone } from "../utils/reportUtils";

const STATUS_FLOW = ["New", "Under Review", "Verified", "Resolved"];

function inferLinkedObjectType(report) {
  const text = `${report.placeName || ""} ${report.category || ""}`.toLowerCase();

  if (text.includes("school") || text.includes("maktab")) return "school";
  if (text.includes("clinic") || text.includes("hospital") || text.includes("health")) return "clinic";
  if (text.includes("water")) return "water";
  if (text.includes("road")) return "road";

  return "";
}

function countRepeatedIssues(report, allReports = []) {
  const reportCoords = parseReportLatLng(report.location);
  const normalizedPlaceName = String(report.placeName || "").trim().toLowerCase();

  return allReports.filter((item) => {
    if (!item || item.id === report.id) return false;
    if (item.category !== report.category) return false;

    const itemCoords = parseReportLatLng(item.location);
    if (reportCoords && itemCoords) {
      return calculateDistanceMeters(reportCoords.lat, reportCoords.lng, itemCoords.lat, itemCoords.lng) <= 400;
    }

    if (!normalizedPlaceName) return false;

    return String(item.placeName || "").trim().toLowerCase() === normalizedPlaceName;
  }).length;
}

function getStatusAgeHours(report) {
  const timestamp = new Date(report.createdAt || report.submittedAt || 0).getTime();
  if (!timestamp) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));
}

function getStatusStageIndex(status) {
  const index = STATUS_FLOW.indexOf(status);
  return index === -1 ? 0 : index;
}

export default function ReportCard({
  report,
  allReports = [],
  compact = false,
  currentUserId = null,
  onConfirmReport,
  onAddEvidence
}) {
  const { getCategoryLabel, getStatusLabel, language, locale } = useI18n();
  const mediaType = report.mediaType || "image";
  const mediaUrl = report.mediaUrl || report.image;
  const categoryLabel = getCategoryLabel(report.category);
  const statusLabel = getStatusLabel(report.status);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceText, setEvidenceText] = useState("");
  const [participationMessage, setParticipationMessage] = useState("");
  const [priorityState, setPriorityState] = useState(null);

  const displayTitle = report.aiTitle || report.placeName || categoryLabel;
  const repeatedIssueCount = useMemo(() => countRepeatedIssues(report, allReports), [allReports, report]);
  const confirmationsCount = Number(report.confirmationsCount) > 0 ? Number(report.confirmationsCount) : report.status === "Resolved" ? 4 : report.status === "Verified" ? 3 : 1;
  const evidenceCount = Number(report.evidenceCount) || 0;
  const currentStageIndex = getStatusStageIndex(report.status);
  const isOwnReport = currentUserId !== null && String(currentUserId) === String(report.userId);
  const hasConfirmed = Boolean(report.userParticipation?.hasConfirmed);
  const userEvidenceCount = Number(report.userParticipation?.userEvidenceCount) || 0;
  const isRepeatedIssue = report.isRepeatedIssue || repeatedIssueCount > 0;
  const repeatedParticipation = isRepeatedIssue && (hasConfirmed || userEvidenceCount > 0);

  const handleToggleDetails = async () => {
    const nextOpen = !detailsOpen;
    setDetailsOpen(nextOpen);

    if (!nextOpen) return;
    if (priorityState?.priorityExplanation || priorityState?.loading) return;

    setPriorityState({ loading: true });

    const result = await requestPriorityExplanation({
      language,
      category: report.category,
      summary: report.summary || report.description,
      severity: report.severity || "",
      linkedObjectType: inferLinkedObjectType(report),
      repeatedIssueCount,
      confirmationsCount: Number(report.confirmationsCount) || 0,
      statusAgeHours: getStatusAgeHours(report)
    });

    setPriorityState({
      ...result,
      loading: false
    });
  };

  const handleConfirmClick = () => {
    if (typeof onConfirmReport !== "function") return;
    const result = onConfirmReport(report.id);
    if (result?.message) setParticipationMessage(result.message);
  };

  const handleEvidenceSubmit = (event) => {
    event.preventDefault();
    if (typeof onAddEvidence !== "function") return;

    const result = onAddEvidence(report.id, evidenceText);
    if (result?.message) setParticipationMessage(result.message);
    if (result?.ok) {
      setEvidenceText("");
      setEvidenceOpen(false);
    }
  };

  return (
    <article className={`report-card ${compact ? "compact" : ""}`}>
      {mediaUrl ? (
        mediaType === "video" ? (
          <video className="report-image" src={mediaUrl} controls playsInline preload="metadata" />
        ) : (
          <img className="report-image" src={mediaUrl} alt={categoryLabel} loading="lazy" />
        )
      ) : (
        <div className="report-image report-image-fallback">{shortText(categoryLabel, 20)}</div>
      )}
      <div className="report-content">
        <div className="report-top-row">
          <span className="category-pill">{categoryLabel}</span>
          <span className={`status-badge ${statusToTone(report.status)}`}>{statusLabel}</span>
        </div>
        <h3 className="place-title">{displayTitle}</h3>
        {report.summary ? <p className="report-ai-summary">{report.summary}</p> : null}
        <p className="report-description">{compact ? shortText(report.description, 68) : shortText(report.description)}</p>
        <div className="meta-grid">
          <span>{report.location}</span>
          <span>{formatDateTime(report.submittedAt, locale)}</span>
        </div>

        <div className="report-indicators">
          {report.placeName ? <span className="indicator-chip object">Object linked</span> : null}
          {isRepeatedIssue ? (
            <span className={`indicator-chip ${repeatedParticipation ? "repeated-helped" : "repeated"}`}>
              {repeatedParticipation
                ? "You helped surface this repeated issue"
                : `Repeated nearby: ${Math.max(1, repeatedIssueCount)}`}
            </span>
          ) : (
            <span className="indicator-chip clean">No nearby duplicates</span>
          )}
          {evidenceCount > 0 ? <span className="indicator-chip evidence">Evidence notes: {evidenceCount}</span> : null}
        </div>

        {!compact ? (
          <div className="community-confirm-block">
            <strong>Community confirmations</strong>
            <p>{confirmationsCount} public confirmations support this report context.</p>
          </div>
        ) : null}

        {!compact && (onConfirmReport || onAddEvidence) ? (
          <div className="participation-actions">
            <button
              type="button"
              className="secondary-btn small-action"
              disabled={isOwnReport || hasConfirmed}
              onClick={handleConfirmClick}
            >
              {isOwnReport ? "Own report" : hasConfirmed ? "Confirmed" : "Confirm issue"}
            </button>
            <button
              type="button"
              className="secondary-btn small-action"
              onClick={() => setEvidenceOpen((prev) => !prev)}
            >
              {evidenceOpen ? "Hide evidence form" : "Add evidence"}
            </button>
          </div>
        ) : null}

        {!compact && evidenceOpen ? (
          <form className="evidence-form" onSubmit={handleEvidenceSubmit}>
            <textarea
              rows={2}
              value={evidenceText}
              onChange={(event) => setEvidenceText(event.target.value)}
              placeholder="Add short factual evidence (what you observed, when, and why it matters)"
            />
            <button type="submit" className="primary-btn small-action">
              Save evidence
            </button>
          </form>
        ) : null}

        {!compact && report.latestEvidence?.note ? (
          <div className="evidence-preview">
            <strong>Latest evidence</strong>
            <p>{shortText(report.latestEvidence.note, 110)}</p>
          </div>
        ) : null}

        {!compact && participationMessage ? <p className="participation-message">{participationMessage}</p> : null}

        {!compact ? (
          <div className="status-mini-timeline" aria-label="Status timeline">
            {STATUS_FLOW.map((statusKey, index) => (
              <div key={statusKey} className={`mini-stage ${index <= currentStageIndex ? "done" : ""}`}>
                <span className="mini-dot" />
                <span>{getStatusLabel(statusKey)}</span>
              </div>
            ))}
          </div>
        ) : null}

        <button type="button" className="ai-detail-toggle" onClick={handleToggleDetails}>
          {detailsOpen ? "Hide priority explanation" : "Why this priority?"}
        </button>

        {detailsOpen ? (
          <div className="ai-priority-panel" aria-live="polite">
            {priorityState?.loading ? (
              <p className="ai-priority-copy">Preparing a short civic priority explanation...</p>
            ) : (
              <>
                <strong className="ai-priority-label">Priority explanation</strong>
                <p className="ai-priority-copy">
                  {priorityState?.priorityExplanation || "Priority is based on the current report details."}
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
