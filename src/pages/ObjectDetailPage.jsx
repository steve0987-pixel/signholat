import React, { useEffect, useMemo, useState } from "react";
import PublicMap from "../components/PublicMap";
import ReportCard from "../components/ReportCard";
import { useI18n } from "../i18n/LanguageProvider";
import { fetchObjectCommunityDetails } from "../services/community";
import { shortText } from "../utils/reportUtils";

function getObjectTypeLabel(type) {
  switch (type) {
    case "school":
      return "School";
    case "clinic":
      return "Clinic";
    case "water":
      return "Water infrastructure";
    case "road":
      return "Road zone";
    default:
      return "Public object";
  }
}

export default function ObjectDetailPage({
  object,
  reports = [],
  onBack,
  onOpenIssueDetail,
  onConfirmReport,
  onAddEvidence,
  currentUserId,
  geoAsrData
}) {
  const { getStatusLabel } = useI18n();
  const [remoteObject, setRemoteObject] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadRemoteObject() {
      if (!object?.key) {
        if (active) setRemoteObject(null);
        return;
      }

      const result = await fetchObjectCommunityDetails(object.key);
      if (!active) return;
      setRemoteObject(result.object || null);
    }

    loadRemoteObject();

    return () => {
      active = false;
    };
  }, [object?.key]);

  const sortedReports = useMemo(() => {
    return [...reports].sort((left, right) => {
      return new Date(right.createdAt || right.submittedAt || 0).getTime() -
        new Date(left.createdAt || left.submittedAt || 0).getTime();
    });
  }, [reports]);

  const unresolvedCountLocal = useMemo(() => {
    return sortedReports.filter((report) => report.status !== "Resolved").length;
  }, [sortedReports]);

  const repeatedSignalsLocal = useMemo(() => {
    const byCategory = sortedReports.reduce((acc, report) => {
      const key = String(report.category || "other").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(byCategory).filter(([, count]) => count > 1).length;
  }, [sortedReports]);

  const unresolvedCount = Number.isFinite(Number(remoteObject?.unresolvedCount))
    ? Number(remoteObject.unresolvedCount)
    : unresolvedCountLocal;
  const repeatedSignals = Number.isFinite(Number(remoteObject?.repeatedIssueCount))
    ? Number(remoteObject.repeatedIssueCount)
    : repeatedSignalsLocal;
  const timelineIssues = Array.isArray(remoteObject?.linkedIssues) && remoteObject.linkedIssues.length
    ? remoteObject.linkedIssues
    : sortedReports.slice(0, 8);
  const objectName = String(remoteObject?.objectName || "").trim() || object.name;
  const objectType = String(remoteObject?.objectType || "").trim() || object.objectType;

  if (!object) {
    return (
      <section className="tab-page">
        <div className="panel empty-state">Object not found.</div>
      </section>
    );
  }

  return (
    <section className="tab-page">
      <header className="page-header">
        <button type="button" className="secondary-btn small-action" onClick={onBack}>
          Back to dashboard
        </button>
        <h1>{objectName}</h1>
        <p>{getObjectTypeLabel(objectType)} monitoring page with linked community issues.</p>
      </header>

      <section className="panel">
        <div className="trust-metrics">
          <article className="trust-card">
            <span className="stat-label">Linked issues</span>
            <strong>{sortedReports.length}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Unresolved</span>
            <strong>{unresolvedCount}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Repeated categories</span>
            <strong>{repeatedSignals}</strong>
          </article>
        </div>
        {object.latestLocation ? <p className="map-hint">Last known location: {shortText(object.latestLocation, 70)}</p> : null}
      </section>

      <PublicMap reports={sortedReports} geoAsrData={geoAsrData} />

      <section className="panel">
        <h3>Issue timeline by object</h3>
        {timelineIssues.length ? (
          <div className="status-history-list">
            {timelineIssues.map((issue) => (
              <article key={issue.id} className="status-history-item">
                <strong>{shortText(issue.title || issue.aiTitle || issue.summary || issue.description, 64)}</strong>
                <span>{getStatusLabel(issue.status)}</span>
                {issue.community ? (
                  <p>
                    Confirmations: {Number(issue.community.confirm) || 0} · Evidence: {Number(issue.community.evidence) || 0}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="map-hint">No linked issues yet.</p>
        )}
      </section>

      <section className="report-list">
        {sortedReports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            allReports={sortedReports}
            currentUserId={currentUserId}
            onConfirmReport={onConfirmReport}
            onAddEvidence={onAddEvidence}
            onOpenIssueDetail={onOpenIssueDetail}
          />
        ))}
      </section>
    </section>
  );
}
