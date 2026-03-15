import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import LanguageSwitcher from "./components/LanguageSwitcher";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SubmitPage from "./pages/SubmitPage";
import { sampleReports } from "./data/sampleReports";
import { fetchGeoAsrData } from "./services/geoasr";
import { createStoredReport, fetchStoredReports, updateStoredReportEnrichment } from "./services/reports";
import { syncDemoReportsToSupabase } from "./services/seedDemoReports";
import {
  addReportConfirmation,
  addReportEvidence,
  createEmptyParticipationState,
  getRepeatedReportIdSet,
  getReportParticipation,
  getUserParticipationStats,
  loadParticipationState,
  saveParticipationState
} from "./utils/participation";
import { updateStreak } from "./utils/streak";
import { calculateXP } from "./utils/xp";

function getTelegramUser() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  if (tgUser) {
    return {
      id: tgUser.id,
      firstName: tgUser.first_name || "",
      lastName: tgUser.last_name || "",
      username: tgUser.username || ""
    };
  }

  return {
    id: 100,
    firstName: "Demo",
    lastName: "",
    username: "real_holat_user"
  };
}

function getReporterName(user) {
  return user.username ? `@${user.username}` : `${user.firstName} ${user.lastName}`.trim();
}

function normalizeReport(report) {
  const media = Array.isArray(report.media)
    ? report.media.filter(Boolean)
    : [report.mediaUrl || report.image].filter(Boolean);
  const createdAt = report.createdAt || report.submittedAt || new Date().toISOString();

  const normalizedReport = {
    ...report,
    aiTitle: report.aiTitle || report.ai_title || "",
    createdAt,
    media,
    mediaUrl: report.mediaUrl || report.image || "",
    mediaType: report.mediaType || "image",
    submittedAt: report.submittedAt || createdAt
  };

  return {
    ...normalizedReport,
    xpAwarded: Number.isFinite(report.xpAwarded) ? report.xpAwarded : calculateXP(normalizedReport)
  };
}

function getUserReputation(allReports, userId) {
  return allReports
    .filter((report) => report.userId === userId)
    .reduce((total, report) => total + (report.xpAwarded || 0), 0);
}

function createEmptyGeoAsrData() {
  return {
    maktab44: [],
    bogcha: [],
    ssv: []
  };
}

function groupGeoAsrItems(items = []) {
  const grouped = createEmptyGeoAsrData();

  items.forEach((item) => {
    if (grouped[item.__source]) {
      grouped[item.__source].push(item);
    }
  });

  return grouped;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("submission");
  const [user] = useState(getTelegramUser);
  const [reports, setReports] = useState(() => sampleReports.map(normalizeReport));
  const [participationState, setParticipationState] = useState(loadParticipationState);
  const [reputationPoints, setReputationPoints] = useState(() => {
    const currentUser = getTelegramUser();
    const seededReports = sampleReports.map(normalizeReport);

    return getUserReputation(seededReports, currentUser.id);
  });
  const [lastXpEvent, setLastXpEvent] = useState(null);
  const [geoAsrState, setGeoAsrState] = useState({
    data: createEmptyGeoAsrData(),
    loading: true,
    error: ""
  });

  useEffect(() => {
    let active = true;

    async function loadGeoAsr() {
      setGeoAsrState((prev) => ({ ...prev, loading: true }));

      try {
        const response = await fetchGeoAsrData();
        if (!active) return;

        setGeoAsrState({
          data: groupGeoAsrItems(response.items || []),
          loading: false,
          error: response.error || ""
        });
      } catch (error) {
        if (!active) return;

        setGeoAsrState({
          data: createEmptyGeoAsrData(),
          loading: false,
          error: error?.message || "Не удалось загрузить GEOASR"
        });
      }
    }

    loadGeoAsr();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStoredReports() {
      let { reports: storedReports } = await fetchStoredReports();
      if (!active || storedReports === null) return;

      if (Array.isArray(storedReports) && storedReports.length === 0) {
        await syncDemoReportsToSupabase();
        const reload = await fetchStoredReports();
        if (!active || reload.reports === null) return;
        storedReports = reload.reports;
      }

      const normalizedStoredReports = storedReports.map(normalizeReport);
      setReports(normalizedStoredReports);
      setReputationPoints(getUserReputation(normalizedStoredReports, user.id));
    }

    loadStoredReports();
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    saveParticipationState(participationState);
  }, [participationState]);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const left = new Date(b.createdAt || b.submittedAt).getTime();
      const right = new Date(a.createdAt || a.submittedAt).getTime();

      return left - right;
    });
  }, [reports]);

  const repeatedReportIds = useMemo(() => getRepeatedReportIdSet(sortedReports), [sortedReports]);

  const reportsWithParticipation = useMemo(() => {
    return sortedReports.map((report) => {
      const participation = getReportParticipation(participationState, report.id, user.id);

      return {
        ...report,
        confirmationsCount: (Number(report.confirmationsCount) || 0) + participation.confirmationsCount,
        evidenceCount: participation.evidenceCount,
        latestEvidence: participation.latestEvidence,
        userParticipation: {
          hasConfirmed: participation.hasConfirmed,
          userEvidenceCount: participation.userEvidenceCount
        },
        isRepeatedIssue: repeatedReportIds.has(String(report.id))
      };
    });
  }, [participationState, repeatedReportIds, sortedReports, user.id]);

  const participationStats = useMemo(() => {
    return getUserParticipationStats(participationState, user.id, repeatedReportIds);
  }, [participationState, repeatedReportIds, user.id]);

  const handleSubmitReport = async (payload) => {
    const createdAt = new Date().toISOString();
    const draftReport = normalizeReport({
      id: `r-${Date.now()}`,
      category: payload.category,
      description: payload.description,
      location: payload.location,
      placeName: payload.placeName,
      image: payload.mediaType === "image" ? payload.mediaUrl : "",
      media: payload.mediaUrl ? [payload.mediaUrl] : [],
      mediaUrl: payload.mediaUrl,
      mediaType: payload.mediaType,
      createdAt,
      submittedAt: createdAt,
      status: "New",
      userId: user.id,
      reporterName: getReporterName(user),
      aiTitle: payload.aiTitle,
      summary: payload.summary,
      context: payload.context,
      severity: payload.severity,
      impact_score: payload.impact_score,
      xpAwarded: calculateXP({
        category: payload.category,
        description: payload.description,
        location: payload.location,
        media: payload.mediaUrl ? [payload.mediaUrl] : []
      })
    });

    const storedReport =
      (await createStoredReport({
        report: draftReport,
        mediaFile: payload.mediaFile,
        user
      })) || draftReport;

    const hydratedReport = normalizeReport({
      ...storedReport,
      aiTitle: draftReport.aiTitle || storedReport.aiTitle || ""
    });
    const xpGained = hydratedReport.xpAwarded;
    const streakCount = updateStreak();

    setReports((prev) => [hydratedReport, ...prev]);
    setReputationPoints((prev) => prev + xpGained);
    setLastXpEvent({
      id: `xp-${Date.now()}`,
      amount: xpGained,
      acknowledged: false,
      streakCount
    });
    setActiveTab("dashboard");

    return { xpGained };
  };

  const handleReportEnriched = (reportId, enrichment) => {
    if (!reportId || !enrichment) return;

    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== reportId) return report;
        return {
          ...report,
          ...enrichment
        };
      })
    );

    void updateStoredReportEnrichment(reportId, enrichment);
  };

  const handleAcknowledgeXpEvent = (eventId) => {
    setLastXpEvent((prev) => {
      if (!prev || prev.id !== eventId) return prev;
      return { ...prev, acknowledged: true };
    });
  };

  const handleConfirmReport = (reportId) => {
    if (!reportId) return { ok: false, message: "Invalid report." };

    const currentReport = reportsWithParticipation.find((report) => String(report.id) === String(reportId));
    if (!currentReport) return { ok: false, message: "Report not found." };
    if (String(currentReport.userId) === String(user.id)) {
      return { ok: false, message: "Self-confirmation is disabled." };
    }

    const result = addReportConfirmation(participationState, {
      reportId,
      userId: user.id
    });

    if (!result.added) {
      return { ok: false, message: "You already confirmed this report." };
    }

    setParticipationState(result.state || createEmptyParticipationState());
    return { ok: true, message: "Confirmation added." };
  };

  const handleAddEvidence = (reportId, note) => {
    if (!reportId) return { ok: false, message: "Invalid report." };

    const result = addReportEvidence(participationState, {
      reportId,
      userId: user.id,
      note
    });

    if (!result.added) {
      return { ok: false, message: "Evidence note is too short." };
    }

    setParticipationState(result.state || createEmptyParticipationState());
    return { ok: true, message: "Evidence added." };
  };

  return (
    <div className="app-shell">
      <main className="content-shell">
        <div className="app-toolbar">
          <strong className="app-brand">Real Holat</strong>
          <LanguageSwitcher />
        </div>

        {activeTab === "submission" ? (
          <SubmitPage geoAsrData={geoAsrState.data} onSubmit={handleSubmitReport} reports={reportsWithParticipation} />
        ) : null}
        {activeTab === "dashboard" ? (
          <DashboardPage
            geoAsrData={geoAsrState.data}
            geoAsrError={geoAsrState.error}
            geoAsrLoading={geoAsrState.loading}
            onAddEvidence={handleAddEvidence}
            onConfirmReport={handleConfirmReport}
            onReportEnriched={handleReportEnriched}
            reports={reportsWithParticipation}
            reputationPoints={reputationPoints}
            user={user}
          />
        ) : null}
        {activeTab === "profile" ? (
          <ProfilePage
            lastXpEvent={lastXpEvent}
            onAcknowledgeXpEvent={handleAcknowledgeXpEvent}
            participationStats={participationStats}
            reports={reportsWithParticipation}
            reputationPoints={reputationPoints}
            user={user}
          />
        ) : null}
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
