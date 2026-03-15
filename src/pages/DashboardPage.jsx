import React, { useMemo, useState } from "react";
import ReportCard from "../components/ReportCard";
import PublicMap from "../components/PublicMap";
import StatsBar from "../components/StatsBar";
import { DATE_FILTERS, STATUS_OPTIONS } from "../constants/options";
import { useI18n } from "../i18n/LanguageProvider";
import { parseReportLatLng } from "../utils/enrichReport";
import { getDateThreshold, shortText } from "../utils/reportUtils";
import { calculateXP } from "../utils/xp";

const ENDPOINT_CATEGORY_OPTIONS = [{ value: "maktab44" }, { value: "bogcha" }, { value: "ssv" }];
const REVIEW_STATUSES = new Set(["New", "Under Review"]);
const STATUS_TIMELINE_ORDER = ["New", "Under Review", "Verified", "Resolved"];

function severityWeight(severity) {
  switch (severity) {
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

function getDisplayName(user) {
  return user.username ? `@${user.username}` : `${user.firstName} ${user.lastName}`.trim();
}

function getContributorInitials(name) {
  const cleaned = name.replace("@", "").trim();
  return cleaned.slice(0, 2).toUpperCase() || "RH";
}

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

export default function DashboardPage({
  onAddEvidence,
  onConfirmReport,
  geoAsrData,
  geoAsrError,
  geoAsrLoading,
  onReportEnriched,
  reports,
  user,
  reputationPoints
}) {
  const { getSourceLabel, getStatusLabel, t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sources, setSources] = useState({
    reports: true,
    maktab44: true,
    bogcha: true,
    ssv: true
  });

  const allGeoAsrItems = useMemo(() => flattenGeoAsrData(geoAsrData), [geoAsrData]);

  const filteredReports = useMemo(() => {
    const threshold = getDateThreshold(dateFilter);
    const keyword = search.trim().toLowerCase();

    return reports
      .filter((report) => {
        if (status !== "all" && report.status !== status) return false;
        if (threshold && getReportTimestamp(report) < threshold) return false;
        if (!keyword) return true;

        const searchableText = `${report.category} ${report.description} ${report.location} ${report.placeName}`.toLowerCase();
        return searchableText.includes(keyword);
      })
      .sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a));
  }, [reports, search, status, dateFilter]);

  const filteredGeoAsrItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return allGeoAsrItems.filter((item) => {
      if (category !== "all" && item.__source !== category) return false;
      if (!sources[item.__source]) return false;
      if (!keyword) return true;

      const text = `${item.obekt_nomi || ""} ${item.viloyat || ""} ${item.tuman || ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [allGeoAsrItems, search, sources, category]);

  const sourceStats = useMemo(() => {
    const counts = {
      reports: filteredReports.length,
      maktab44: 0,
      bogcha: 0,
      ssv: 0
    };

    filteredGeoAsrItems.forEach((item) => {
      if (counts[item.__source] !== undefined) {
        counts[item.__source] += 1;
      }
    });

    return counts;
  }, [filteredReports, filteredGeoAsrItems]);

  const repeatedSignals = useMemo(() => {
    const signalCounts = new Map();

    filteredReports.forEach((report) => {
      const key = getReportSignalKey(report);
      signalCounts.set(key, (signalCounts.get(key) || 0) + 1);
    });

    const repeatedReportsCount = filteredReports.filter((report) => (signalCounts.get(getReportSignalKey(report)) || 0) > 1).length;
    const repeatedClusters = [...signalCounts.values()].filter((count) => count > 1).length;

    return {
      repeatedReportsCount,
      repeatedClusters
    };
  }, [filteredReports]);

  const communityConfirmations = useMemo(() => {
    return filteredReports.reduce((total, report) => {
      const explicit = Number(report.confirmationsCount);
      if (Number.isFinite(explicit) && explicit > 0) return total + explicit;
      return total + (report.status === "Resolved" ? 4 : report.status === "Verified" ? 3 : 1);
    }, 0);
  }, [filteredReports]);

  const objectLinkedReports = useMemo(() => {
    return filteredReports.filter((report) => report.placeName).slice(0, 4);
  }, [filteredReports]);

  const statusTimeline = useMemo(() => {
    const counts = STATUS_TIMELINE_ORDER.reduce((acc, statusKey) => {
      acc[statusKey] = filteredReports.filter((report) => report.status === statusKey).length;
      return acc;
    }, {});

    return {
      counts,
      total: filteredReports.length || 1
    };
  }, [filteredReports]);

  const priorityCards = useMemo(() => {
    return [...filteredReports]
      .sort((left, right) => {
        const leftImpact = Number(left.impact_score);
        const rightImpact = Number(right.impact_score);

        if (Number.isFinite(rightImpact) || Number.isFinite(leftImpact)) {
          if (!Number.isFinite(leftImpact)) return 1;
          if (!Number.isFinite(rightImpact)) return -1;
          if (rightImpact !== leftImpact) return rightImpact - leftImpact;
        }

        const severityDiff = severityWeight(right.severity) - severityWeight(left.severity);
        if (severityDiff !== 0) return severityDiff;

        return getReportTimestamp(right) - getReportTimestamp(left);
      })
      .slice(0, 3);
  }, [filteredReports]);

  const topContributors = useMemo(() => {
    const contributors = new Map();

    reports.forEach((report) => {
      const key = report.userId ?? report.reporterName;
      const currentEntry = contributors.get(key) || {
        userId: report.userId,
        reporterName: report.reporterName || t("common.telegramUser"),
        reportsCount: 0,
        reputationPoints: 0,
        isCurrentUser: report.userId === user.id
      };

      currentEntry.reporterName = report.userId === user.id ? getDisplayName(user) : currentEntry.reporterName;
      currentEntry.reportsCount += 1;
      currentEntry.reputationPoints += report.xpAwarded || calculateXP(report);
      currentEntry.isCurrentUser = currentEntry.isCurrentUser || report.userId === user.id;

      contributors.set(key, currentEntry);
    });

    if (contributors.has(user.id)) {
      const currentUserEntry = contributors.get(user.id);
      currentUserEntry.reputationPoints = Math.max(currentUserEntry.reputationPoints, reputationPoints);
      currentUserEntry.reporterName = getDisplayName(user);
      currentUserEntry.isCurrentUser = true;
    } else {
      contributors.set(user.id, {
        userId: user.id,
        reporterName: getDisplayName(user),
        reportsCount: 0,
        reputationPoints,
        isCurrentUser: true
      });
    }

    const rankedContributors = [...contributors.values()].sort((a, b) => {
      if (b.reputationPoints !== a.reputationPoints) return b.reputationPoints - a.reputationPoints;
      return b.reportsCount - a.reportsCount;
    });

    let topThree = rankedContributors.slice(0, 3);
    if (!topThree.some((entry) => entry.userId === user.id)) {
      topThree = [...topThree.slice(0, 2), contributors.get(user.id)];
    }

    return topThree
      .filter(Boolean)
      .sort((a, b) => {
        if (b.reputationPoints !== a.reputationPoints) return b.reputationPoints - a.reputationPoints;
        return b.reportsCount - a.reportsCount;
      })
      .slice(0, 3);
  }, [reports, reputationPoints, t, user]);

  const transparencyBlocks = useMemo(() => {
    return [
      {
        title: "Needs human review",
        value: filteredReports.filter((report) => REVIEW_STATUSES.has(report.status)).length,
        tone: "warning",
        copy: "New and under-review reports remain visible for public oversight."
      },
      {
        title: "Community confirmations",
        value: communityConfirmations,
        tone: "neutral",
        copy: "Residents confirm location and issue validity before escalation."
      },
      {
        title: "Repeated issue clusters",
        value: repeatedSignals.repeatedClusters,
        tone: "danger",
        copy: "Repeated signals highlight unresolved infrastructure pressure points."
      },
      {
        title: "Resolved (30 days)",
        value: filteredReports.filter((report) => report.status === "Resolved" && getReportTimestamp(report) >= Date.now() - 30 * 24 * 60 * 60 * 1000)
          .length,
        tone: "success",
        copy: "Resolved records remain open to strengthen institutional accountability."
      }
    ];
  }, [communityConfirmations, filteredReports, repeatedSignals.repeatedClusters]);

  const toggleSource = (key) => {
    setSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="tab-page">
      <header className="page-header civic-header">
        <p className="civic-eyebrow">Public-service civic-tech platform</p>
        <h1>Real Holat Pulse</h1>
        <p>Map-driven oversight for schools, clinics, drinking water, and internal roads across Uzbekistan.</p>
      </header>

      <section className="panel dashboard-hero">
        <div>
          <p className="hero-kicker">Public Transparency Layer</p>
          <h2>Community reports with accountable status flow</h2>
          <p>
            Every issue remains public with object-linked context, repeated issue signals, and human review markers.
          </p>
        </div>
        <div className="hero-metrics">
          <article>
            <span>Public reports</span>
            <strong>{filteredReports.length}</strong>
          </article>
          <article>
            <span>Mapped objects</span>
            <strong>{filteredGeoAsrItems.length}</strong>
          </article>
          <article>
            <span>Repeated reports</span>
            <strong>{repeatedSignals.repeatedReportsCount}</strong>
          </article>
        </div>
      </section>

      <PublicMap
        fullHeight
        geoAsrData={geoAsrData}
        geoAsrItems={filteredGeoAsrItems}
        onReportEnriched={onReportEnriched}
        reports={sources.reports ? filteredReports : []}
      />

      <section className="panel status-timeline-panel">
        <div className="panel-title-row">
          <div>
            <h3>Status timeline</h3>
            <p>Transparent progress from first signal to final resolution.</p>
          </div>
        </div>
        <div className="status-timeline">
          {STATUS_TIMELINE_ORDER.map((statusKey) => {
            const count = statusTimeline.counts[statusKey] || 0;
            const width = count ? Math.max(12, Math.round((count / statusTimeline.total) * 100)) : 0;
            return (
              <article key={statusKey} className={`timeline-step ${count ? "active" : ""}`}>
                <div className="timeline-row">
                  <span className={`status-badge ${statusKey === "Resolved" ? "resolved" : statusKey === "Verified" ? "verified" : statusKey === "Under Review" ? "review" : "new"}`}>
                    {getStatusLabel(statusKey)}
                  </span>
                  <strong>{count}</strong>
                </div>
                <div className="timeline-track">
                  <div className="timeline-fill" style={{ width: `${width}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <StatsBar reports={reports} />

      <div className="panel filter-panel">
        <input
          type="search"
          placeholder={t("dashboard.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-grid">
          <label>
            {t("dashboard.apiEndpoint")}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">{t("common.all")}</option>
              {ENDPOINT_CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {getSourceLabel(item.value)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("dashboard.status")}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{t("common.all")}</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {getStatusLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t("dashboard.date")}
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              {DATE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value === "all"
                    ? t("common.allTime")
                    : item.value === "today"
                      ? t("common.today")
                      : item.value === "7d"
                        ? t("common.last7Days")
                        : t("common.last30Days")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="source-filter-row" aria-label={t("dashboard.sourceFilters")}>
          <button
            type="button"
            className={`source-chip ${sources.reports ? "active" : ""}`}
            onClick={() => toggleSource("reports")}
          >
            {getSourceLabel("reports")} {sourceStats.reports}
          </button>
          <button
            type="button"
            className={`source-chip ${sources.maktab44 ? "active" : ""}`}
            onClick={() => toggleSource("maktab44")}
          >
            {getSourceLabel("maktab44")} {sourceStats.maktab44}
          </button>
          <button
            type="button"
            className={`source-chip ${sources.bogcha ? "active" : ""}`}
            onClick={() => toggleSource("bogcha")}
          >
            {getSourceLabel("bogcha")} {sourceStats.bogcha}
          </button>
          <button
            type="button"
            className={`source-chip ${sources.ssv ? "active" : ""}`}
            onClick={() => toggleSource("ssv")}
          >
            {getSourceLabel("ssv")} {sourceStats.ssv}
          </button>
        </div>

        {geoAsrLoading ? <p className="map-hint">Loading public object registry...</p> : null}
        {geoAsrError ? <p className="error-text">{geoAsrError}</p> : null}
      </div>

      <section className="panel civic-insight-panel">
        <div className="civic-insight-grid">
          <article className="civic-insight-card warning">
            <span>Needs human review</span>
            <strong>{filteredReports.filter((report) => REVIEW_STATUSES.has(report.status)).length}</strong>
            <p>Publicly visible until operators complete verification.</p>
          </article>
          <article className="civic-insight-card neutral">
            <span>Community confirmations</span>
            <strong>{communityConfirmations}</strong>
            <p>Citizen confirmations help validate location and urgency.</p>
          </article>
          <article className="civic-insight-card danger">
            <span>Repeated issue indicators</span>
            <strong>{repeatedSignals.repeatedReportsCount}</strong>
            <p>Recurring reports flag unresolved pressure points in services.</p>
          </article>
        </div>
      </section>

      <section className="panel priority-section">
        <div className="panel-title-row">
          <div>
            <h3>Priority explanation cards</h3>
            <p>Short explainable highlights for triage and civic oversight.</p>
          </div>
        </div>
        <div className="priority-grid">
          {priorityCards.length ? (
            priorityCards.map((report) => {
              const severity = report.severity || "default";
              const impact = Number(report.impact_score);
              return (
                <article key={report.id} className={`priority-card ${severity}`}>
                  <div className="priority-card-head">
                    <span className={`severity-dot ${severity}`} />
                    <strong>{shortText(report.summary || report.description || "Issue report", 64)}</strong>
                  </div>
                  <p>{shortText(report.context || "AI keeps this card in review mode and asks for human validation.", 120)}</p>
                  <div className="priority-meta">
                    <span>{shortText(report.location, 28)}</span>
                    <span>{Number.isFinite(impact) ? `Impact ${impact.toFixed(1)} / 10` : "Needs human review"}</span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="panel empty-state">Priority cards appear as soon as reports are enriched.</div>
          )}
        </div>
      </section>

      <section className="panel transparency-section">
        <div className="panel-title-row">
          <div>
            <h3>Public transparency metrics</h3>
            <p>Short civic signals designed for residents, journalists, and service operators.</p>
          </div>
        </div>
        <div className="transparency-grid">
          {transparencyBlocks.map((item) => (
            <article key={item.title} className={`transparency-card ${item.tone}`}>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel object-linked-section">
        <div className="panel-title-row">
          <div>
            <h3>Object-linked report cards</h3>
            <p>Issue cards anchored to schools, clinics, water nodes, and road segments.</p>
          </div>
        </div>
        <div className="object-link-grid">
          {objectLinkedReports.length ? (
            objectLinkedReports.map((report) => (
              <article key={report.id} className="object-link-card">
                <span className="object-link-type">{shortText(report.category, 26)}</span>
                <strong>{shortText(report.placeName || "Unnamed public object", 46)}</strong>
                <p>{shortText(report.summary || report.description, 92)}</p>
                <div className="object-link-footer">
                  <span className={`status-badge ${report.status === "Resolved" ? "resolved" : report.status === "Verified" ? "verified" : report.status === "Under Review" ? "review" : "new"}`}>
                    {getStatusLabel(report.status)}
                  </span>
                  <span>{shortText(report.location, 26)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="panel empty-state">No object-linked reports under current filters.</div>
          )}
        </div>
      </section>

      <section className="panel leaderboard-panel" aria-label={t("dashboard.topContributors")}>
        <div className="panel-title-row">
          <div>
            <h3>{t("dashboard.topContributors")}</h3>
            <p>{t("dashboard.contributorsSubtitle")}</p>
          </div>
        </div>

        <div className="leaderboard-row">
          {topContributors.map((contributor, index) => (
            <article
              key={contributor.userId || contributor.reporterName}
              className={`leader-card ${contributor.isCurrentUser ? "is-current" : ""}`}
            >
              <span className="leader-rank">#{index + 1}</span>
              <div className="leader-avatar">{getContributorInitials(contributor.reporterName)}</div>
              <strong>{contributor.isCurrentUser ? t("common.you") : contributor.reporterName}</strong>
              <span>{contributor.reputationPoints} {t("common.pointsShort")}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="report-list" aria-label={t("common.reports")}>
        {filteredReports.length ? (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              allReports={reports}
              currentUserId={user.id}
              onAddEvidence={onAddEvidence}
              onConfirmReport={onConfirmReport}
              report={report}
            />
          ))
        ) : (
          <div className="panel empty-state">{t("dashboard.noMatches")}</div>
        )}
      </section>
    </section>
  );
}
