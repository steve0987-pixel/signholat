import React, { useMemo, useState } from "react";
import OnboardingAssistant from "../components/OnboardingAssistant";
import PublicMap from "../components/PublicMap";
import { STATUS_OPTIONS } from "../constants/options";
import { useI18n } from "../i18n/LanguageProvider";
import { parseReportLatLng } from "../utils/enrichReport";
import { buildObjectIndex } from "../utils/objectModel";
import { shortText, statusToTone } from "../utils/reportUtils";

const SOURCE_OPTIONS = ["all", "maktab44", "bogcha", "ssv"];

function flattenGeoAsrData(geoAsrData = {}) {
  return Object.entries(geoAsrData).flatMap(([source, items]) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({ ...item, __source: item.__source || source }));
  });
}

function getReportTimestamp(report) {
  return new Date(report.createdAt || report.submittedAt || 0).getTime();
}

function getReportSignalKey(report) {
  const coords = parseReportLatLng(report.location);
  if (coords) {
    return `${report.category}|${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
  }

  return `${report.category}|${String(report.placeName || "").trim().toLowerCase()}`;
}

function severityScore(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function getPlaceLabel(report) {
  const placeName = String(report.placeName || "").trim();
  if (placeName) return shortText(placeName, 42);

  if (parseReportLatLng(report.location)) return "Location on map";

  return shortText(report.location || "Location not specified", 42);
}

function getPriorityReason(report, isRepeatedIssue) {
  const severity = String(report.severity || "").toLowerCase();
  const confirmationsCount = Number(report.confirmationsCount) || 0;

  if (severity === "critical" || severity === "high") {
    return "High severity near essential public infrastructure.";
  }

  if (isRepeatedIssue) {
    return "Repeated issue signal from nearby reports.";
  }

  if (confirmationsCount >= 2) {
    return "Multiple community confirmations received.";
  }

  if (report.status === "In Progress") {
    return "Work started, still needs public follow-up.";
  }

  if (report.status === "Under Review") {
    return "Awaiting verification by responsible services.";
  }

  return "Needs public attention and review.";
}

function sortAttentionIssues(left, right, repeatedReportIds) {
  const leftImpact = Number(left.impact_score) > 0 ? Number(left.impact_score) : null;
  const rightImpact = Number(right.impact_score) > 0 ? Number(right.impact_score) : null;

  if (rightImpact !== null || leftImpact !== null) {
    if (leftImpact === null) return 1;
    if (rightImpact === null) return -1;
    if (rightImpact !== leftImpact) return rightImpact - leftImpact;
  }

  const leftRepeated = repeatedReportIds.has(String(left.id)) ? 1 : 0;
  const rightRepeated = repeatedReportIds.has(String(right.id)) ? 1 : 0;
  if (rightRepeated !== leftRepeated) return rightRepeated - leftRepeated;

  const severityDiff = severityScore(right.severity) - severityScore(left.severity);
  if (severityDiff !== 0) return severityDiff;

  const confirmationsDiff = (Number(right.confirmationsCount) || 0) - (Number(left.confirmationsCount) || 0);
  if (confirmationsDiff !== 0) return confirmationsDiff;

  return getReportTimestamp(right) - getReportTimestamp(left);
}

export default function DashboardPage({
  geoAsrData,
  geoAsrError,
  geoAsrLoading,
  onReportEnriched,
  onOpenIssueDetail,
  onOpenObjectDetail,
  reports
}) {
  const { getStatusLabel, t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [reportCategory, setReportCategory] = useState("all");
  const [objectSource, setObjectSource] = useState("all");
  const [focusMode, setFocusMode] = useState("issues");
  const [showAll, setShowAll] = useState(false);

  const allGeoAsrItems = useMemo(() => flattenGeoAsrData(geoAsrData), [geoAsrData]);

  const reportCategories = useMemo(() => {
    return [...new Set((reports || []).map((report) => report.category).filter(Boolean))];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (reports || [])
      .filter((report) => {
        if (status !== "all" && report.status !== status) return false;
        if (reportCategory !== "all" && report.category !== reportCategory) return false;

        if (!keyword) return true;

        const searchableText = [
          report.aiTitle,
          report.summary,
          report.description,
          report.placeName,
          report.location,
          report.category
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(keyword);
      })
      .sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a));
  }, [reportCategory, reports, search, status]);

  const filteredGeoAsrItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return allGeoAsrItems.filter((item) => {
      if (objectSource !== "all" && item.__source !== objectSource) return false;
      if (!keyword) return true;

      const text = `${item.obekt_nomi || ""} ${item.viloyat || ""} ${item.tuman || ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [allGeoAsrItems, objectSource, search]);

  const repeatedReportIds = useMemo(() => {
    const signalCounts = new Map();

    filteredReports.forEach((report) => {
      const key = getReportSignalKey(report);
      signalCounts.set(key, (signalCounts.get(key) || 0) + 1);
    });

    return new Set(
      filteredReports
        .filter((report) => (signalCounts.get(getReportSignalKey(report)) || 0) > 1)
        .map((report) => String(report.id))
    );
  }, [filteredReports]);

  const kpis = useMemo(() => {
    const resolvedOrVerified = filteredReports.filter(
      (report) => report.status === "Verified" || report.status === "Resolved"
    ).length;

    return {
      publicReports: filteredReports.length,
      repeatedIssues: repeatedReportIds.size,
      resolvedOrVerified
    };
  }, [filteredReports, repeatedReportIds.size]);

  const attentionIssues = useMemo(() => {
    const ranked = [...filteredReports].sort((left, right) => sortAttentionIssues(left, right, repeatedReportIds));
    return showAll ? ranked : ranked.slice(0, 5);
  }, [filteredReports, repeatedReportIds, showAll]);

  const attentionObjects = useMemo(() => {
    const index = buildObjectIndex(filteredReports);
    const ranked = Object.values(index).sort((left, right) => {
      if (right.unresolvedCount !== left.unresolvedCount) return right.unresolvedCount - left.unresolvedCount;
      if (right.repeatedIssueCount !== left.repeatedIssueCount) return right.repeatedIssueCount - left.repeatedIssueCount;
      return (right.reports?.length || 0) - (left.reports?.length || 0);
    });

    return showAll ? ranked : ranked.slice(0, 5);
  }, [filteredReports, showAll]);

  const hasIssues = attentionIssues.length > 0;
  const hasObjects = attentionObjects.length > 0;

  return (
    <section className="tab-page">
      <header className="page-header civic-header">
        <p className="civic-eyebrow">Public overview</p>
        <h1>Real Holat Pulse</h1>
        <p>See where issues are happening, what repeats, and where attention is needed now.</p>
      </header>

      <OnboardingAssistant currentTab="dashboard" />

      <section className="panel">
        <div className="trust-metrics">
          <article className="trust-card">
            <span className="stat-label">Public reports</span>
            <strong>{kpis.publicReports}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Repeated issues</span>
            <strong>{kpis.repeatedIssues}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Verified / Resolved</span>
            <strong>{kpis.resolvedOrVerified}</strong>
          </article>
        </div>
      </section>

      <div className="panel filter-panel">
        <input
          type="search"
          placeholder={t("dashboard.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="filter-grid">
          <label>
            Category
            <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}>
              <option value="all">{t("common.all")}</option>
              {reportCategories.map((categoryValue) => (
                <option key={categoryValue} value={categoryValue}>
                  {categoryValue}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("dashboard.status")}
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">{t("common.all")}</option>
              {STATUS_OPTIONS.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {getStatusLabel(statusValue)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Object source
            <select value={objectSource} onChange={(event) => setObjectSource(event.target.value)}>
              {SOURCE_OPTIONS.map((sourceValue) => (
                <option key={sourceValue} value={sourceValue}>
                  {sourceValue === "all" ? t("common.all") : sourceValue}
                </option>
              ))}
            </select>
          </label>
        </div>

        {geoAsrLoading ? <p className="map-hint">Loading public object registry...</p> : null}
        {geoAsrError ? <p className="error-text">{geoAsrError}</p> : null}
      </div>

      <PublicMap
        fullHeight
        geoAsrData={geoAsrData}
        geoAsrItems={filteredGeoAsrItems}
        onReportEnriched={onReportEnriched}
        reports={filteredReports}
      />

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h3>{focusMode === "issues" ? "Top issues needing attention" : "Top objects needing attention"}</h3>
            <p>
              {focusMode === "issues"
                ? "Short, actionable list for quick review and follow-up."
                : "Objects with unresolved or repeated issue pressure."}
            </p>
          </div>
          <div className="source-filter-row">
            <button
              type="button"
              className={`source-chip ${focusMode === "issues" ? "active" : ""}`}
              onClick={() => {
                setFocusMode("issues");
                setShowAll(false);
              }}
            >
              Issues
            </button>
            <button
              type="button"
              className={`source-chip ${focusMode === "objects" ? "active" : ""}`}
              onClick={() => {
                setFocusMode("objects");
                setShowAll(false);
              }}
            >
              Objects
            </button>
          </div>
        </div>

        {focusMode === "issues" ? (
          hasIssues ? (
            <div className="object-link-grid">
              {attentionIssues.map((report) => {
                const confirmations = Number(report.confirmationsCount) || 0;
                const isRepeatedIssue = repeatedReportIds.has(String(report.id));
                const displayTitle = shortText(report.aiTitle || report.summary || report.description || "Issue report", 64);

                return (
                  <article key={report.id} className="object-link-card">
                    <div className="object-link-footer">
                      <span className={`status-badge ${statusToTone(report.status)}`}>{getStatusLabel(report.status)}</span>
                      <span>{getPlaceLabel(report)}</span>
                    </div>
                    <strong>{displayTitle}</strong>
                    <p>{getPriorityReason(report, isRepeatedIssue)}</p>
                    <div className="object-link-footer">
                      <span>{confirmations > 0 ? `${confirmations} confirmations` : "No confirmations yet"}</span>
                      <button
                        type="button"
                        className="secondary-btn small-action"
                        onClick={() => onOpenIssueDetail?.(report.id)}
                      >
                        Open details
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="panel empty-state">No issues match current filters.</div>
          )
        ) : hasObjects ? (
          <div className="object-link-grid">
            {attentionObjects.map((object) => {
              const leadReport = object.reports?.[0];
              const openObject = () => {
                if (leadReport?.id) onOpenObjectDetail?.(leadReport.id);
              };

              return (
                <article key={object.key} className="object-link-card">
                  <span className="object-link-type">{shortText(object.objectType || "public object", 26)}</span>
                  <strong>{shortText(object.name, 54)}</strong>
                  <p>Unresolved: {object.unresolvedCount} - Repeated categories: {object.repeatedIssueCount}</p>
                  <div className="object-link-footer">
                    <span>{(object.reports || []).length} linked issues</span>
                    <button type="button" className="secondary-btn small-action" onClick={openObject}>
                      Open object
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel empty-state">No objects match current filters.</div>
        )}

        <div className="source-filter-row">
          <button
            type="button"
            className="source-chip active"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? (focusMode === "issues" ? "Show top issues" : "Show top objects") : focusMode === "issues" ? "Open all issues" : "Open all objects"}
          </button>
        </div>
      </section>
    </section>
  );
}
