import React, { useEffect, useMemo, useState } from "react";
import ReportCard from "../components/ReportCard";
import PublicMap from "../components/PublicMap";
import { getNextStatus } from "../constants/statusLifecycle";
import { useI18n } from "../i18n/LanguageProvider";
import { fetchReportCommunityActivity } from "../services/community";
import { requestPriorityExplanation } from "../services/ai";
import { inferObjectTypeFromReport, getObjectKeyFromReport } from "../utils/objectModel";
import { formatDateTime, shortText, statusToTone } from "../utils/reportUtils";

function getStatusAgeHours(report) {
  const createdAt = new Date(report?.createdAt || report?.submittedAt || 0).getTime();
  if (!createdAt) return 0;
  return Math.max(0, Math.round((Date.now() - createdAt) / (1000 * 60 * 60)));
}

function buildRelatedIssues(report, reports = []) {
  const objectKey = getObjectKeyFromReport(report);

  return reports
    .filter((item) => item.id !== report.id)
    .filter((item) => item.category === report.category || getObjectKeyFromReport(item) === objectKey)
    .sort((left, right) => new Date(right.createdAt || right.submittedAt || 0) - new Date(left.createdAt || left.submittedAt || 0))
    .slice(0, 5);
}

function getActorLabel(actor) {
  if (!actor || typeof actor !== "object") return "Участник сообщества";
  if (String(actor.displayName || "").trim()) return String(actor.displayName).trim();
  if (String(actor.username || "").trim()) return `@${String(actor.username).trim()}`;
  return "Участник сообщества";
}

function getActionLabel(actionType) {
  switch (String(actionType || "").toLowerCase()) {
    case "confirm":
      return "подтвердил проблему";
    case "evidence":
      return "добавил доказательство";
    case "still_unresolved":
      return "отметил, что проблема не решена";
    case "confirm_object":
      return "подтвердил связь с объектом";
    case "suggest_duplicate":
      return "предложил связь с похожей заявкой";
    default:
      return "добавил действие";
  }
}

export default function IssueDetailPage({
  report,
  reports = [],
  statusHistory = [],
  onBack,
  onConfirmReport,
  onAddEvidence,
  onAdvanceStatus,
  onOpenIssueDetail,
  onOpenObjectDetail,
  currentUserId,
  geoAsrData
}) {
  const { getStatusLabel, getCategoryLabel, language, locale } = useI18n();
  const [priorityState, setPriorityState] = useState(null);
  const [communityState, setCommunityState] = useState({
    loading: false,
    summary: null,
    recentActions: [],
    error: ""
  });

  const confirmationsCount = Number(communityState.summary?.confirm) || Number(report?.confirmationsCount) || 0;
  const evidenceCount = Number(communityState.summary?.evidence) || Number(report?.evidenceCount) || 0;
  const relatedIssues = useMemo(() => buildRelatedIssues(report, reports), [report, reports]);
  const repeatedIssueCount = Math.max(0, relatedIssues.length);
  const nextStatus = getNextStatus(report?.status);

  useEffect(() => {
    let active = true;

    async function loadPriorityExplanation() {
      if (!report) return;

      const result = await requestPriorityExplanation({
        language,
        category: report.category,
        summary: report.summary || report.description || "",
        severity: report.severity || "",
        linkedObjectType: inferObjectTypeFromReport(report),
        repeatedIssueCount,
        confirmationsCount,
        statusAgeHours: getStatusAgeHours(report)
      });

      if (!active) return;
      setPriorityState(result);
    }

    loadPriorityExplanation();
    return () => {
      active = false;
    };
  }, [confirmationsCount, language, repeatedIssueCount, report]);

  useEffect(() => {
    let active = true;

    async function loadCommunityActivity() {
      if (!report?.id) return;

      setCommunityState((prev) => ({
        ...prev,
        loading: true,
        error: ""
      }));

      const result = await fetchReportCommunityActivity(report.id);
      if (!active) return;

      if (!result.activity) {
        setCommunityState({
          loading: false,
          summary: null,
          recentActions: [],
          error: result.error || "unavailable"
        });
        return;
      }

      setCommunityState({
        loading: false,
        summary: result.activity.summary || null,
        recentActions: Array.isArray(result.activity.recentActions) ? result.activity.recentActions : [],
        error: ""
      });
    }

    loadCommunityActivity();
    return () => {
      active = false;
    };
  }, [report?.id]);

  const handleConfirmWithRefresh = async () => {
    if (typeof onConfirmReport !== "function") return;

    const result = await onConfirmReport(report.id);
    if (result?.ok) {
      const refreshed = await fetchReportCommunityActivity(report.id);
      if (refreshed.activity) {
        setCommunityState({
          loading: false,
          summary: refreshed.activity.summary || null,
          recentActions: Array.isArray(refreshed.activity.recentActions) ? refreshed.activity.recentActions : [],
          error: ""
        });
      }
    }
  };

  const handleEvidenceWithRefresh = async () => {
    if (typeof onAddEvidence !== "function") return;

    const result = await onAddEvidence(report.id, "Additional community evidence provided on detail page.");
    if (result?.ok) {
      const refreshed = await fetchReportCommunityActivity(report.id);
      if (refreshed.activity) {
        setCommunityState({
          loading: false,
          summary: refreshed.activity.summary || null,
          recentActions: Array.isArray(refreshed.activity.recentActions) ? refreshed.activity.recentActions : [],
          error: ""
        });
      }
    }
  };

  if (!report) {
    return (
      <section className="tab-page">
        <div className="panel empty-state">Issue not found.</div>
      </section>
    );
  }

  return (
    <section className="tab-page">
      <header className="page-header">
        <button type="button" className="secondary-btn small-action" onClick={onBack}>
          Back to dashboard
        </button>
        <h1>{report.aiTitle || report.placeName || getCategoryLabel(report.category)}</h1>
        <p>{shortText(report.summary || report.description, 160)}</p>
      </header>

      <section className="panel">
        <div className="report-top-row">
          <span className="category-pill">{getCategoryLabel(report.category)}</span>
          <span className={`status-badge ${statusToTone(report.status)}`}>{getStatusLabel(report.status)}</span>
        </div>
        <p className="map-hint">
          Created {formatDateTime(report.createdAt || report.submittedAt, locale)} · {report.location}
        </p>
        <p style={{ marginTop: 8 }}>{report.description}</p>
        {report.placeName ? (
          <p style={{ marginTop: 10 }}>
            Linked object:{" "}
            {onOpenObjectDetail ? (
              <button
                type="button"
                className="secondary-btn small-action"
                onClick={() => onOpenObjectDetail(report.id)}
              >
                {report.placeName}
              </button>
            ) : (
              <strong>{report.placeName}</strong>
            )}
          </p>
        ) : null}
      </section>

      {report.mediaUrl || report.image ? (
        <section className="panel">
          <h3>Evidence media</h3>
          {report.mediaType === "video" ? (
            <video className="upload-preview" src={report.mediaUrl || report.image} controls playsInline preload="metadata" />
          ) : (
            <img className="upload-preview" src={report.mediaUrl || report.image} alt={report.aiTitle || "Issue media"} />
          )}
        </section>
      ) : null}

      <PublicMap reports={[report]} geoAsrData={geoAsrData} />

      <section className="panel">
        <h3>Priority explanation</h3>
        <p>{priorityState?.priorityExplanation || "Preparing priority explanation..."}</p>
      </section>

      <section className="panel">
        <h3>Status timeline</h3>
        {statusHistory.length ? (
          <div className="status-history-list">
            {statusHistory.map((event) => (
              <article key={event.id} className="status-history-item">
                <span className={`status-badge ${statusToTone(event.status)}`}>{getStatusLabel(event.status)}</span>
                <span>{formatDateTime(event.createdAt, locale)}</span>
                {event.note ? <p>{event.note}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="map-hint">No status events yet.</p>
        )}
        {nextStatus && onAdvanceStatus ? (
          <button
            type="button"
            className="secondary-btn small-action"
            onClick={() => onAdvanceStatus(report.id, nextStatus)}
          >
            Move to "{getStatusLabel(nextStatus)}"
          </button>
        ) : null}
      </section>

      <section className="panel">
        <h3>Community validation</h3>
        <p>
          Confirmations: <strong>{confirmationsCount}</strong> · Evidence notes: <strong>{evidenceCount}</strong>
        </p>
        <div className="participation-actions" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="secondary-btn small-action"
            onClick={handleConfirmWithRefresh}
          >
            Confirm this issue
          </button>
          <button
            type="button"
            className="secondary-btn small-action"
            onClick={handleEvidenceWithRefresh}
          >
            Add quick evidence
          </button>
        </div>
        {communityState.loading ? <p className="map-hint">Загружаем действия сообщества...</p> : null}
        {communityState.error ? <p className="map-hint">Детальные действия сообщества временно недоступны.</p> : null}
        {!communityState.loading && communityState.recentActions.length ? (
          <div className="status-history-list" style={{ marginTop: 10 }}>
            {communityState.recentActions.slice(0, 6).map((action) => (
              <article key={action.id} className="status-history-item">
                <strong>
                  {getActorLabel(action.actor)} {getActionLabel(action.actionType)}
                </strong>
                <span>{formatDateTime(action.createdAt, locale)}</span>
                {action.note ? <p>{shortText(action.note, 140)}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h3>Related issues</h3>
        <p className="map-hint">Repeated context: {repeatedIssueCount} related issues in this area/object.</p>
      </section>

      <section className="report-list">
        {relatedIssues.length ? (
          relatedIssues.map((item) => (
            <ReportCard
              key={item.id}
              report={item}
              allReports={reports}
              compact
              currentUserId={currentUserId}
              onOpenIssueDetail={onOpenIssueDetail}
            />
          ))
        ) : (
          <div className="panel empty-state">No related issues yet.</div>
        )}
      </section>
    </section>
  );
}
