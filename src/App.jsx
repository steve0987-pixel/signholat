import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import LanguageSwitcher from "./components/LanguageSwitcher";
import DashboardPage from "./pages/DashboardPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import ObjectDetailPage from "./pages/ObjectDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SubmitPage from "./pages/SubmitPage";
import { normalizeStatus } from "./constants/statusLifecycle";
import { sampleReports } from "./data/sampleReports";
import {
  createReportPeerAction,
  fetchReportCommunityActivity,
  toParticipationEvents
} from "./services/community";
import { fetchGeoAsrData } from "./services/geoasr";
import { createParticipationEvent, fetchParticipationEvents } from "./services/participationStore";
import {
  createStoredReport,
  fetchStoredReports,
  updateStoredReportEnrichment,
  updateStoredReportStatus
} from "./services/reports";
import { syncDemoReportsToSupabase } from "./services/seedDemoReports";
import { createStatusHistoryEvent, fetchStatusHistory } from "./services/statusHistory";
import {
  addReportConfirmation,
  addReportEvidence,
  buildParticipationStateFromEvents,
  createEmptyParticipationState,
  getRepeatedReportIdSet,
  getReportParticipation,
  getUserParticipationStats,
  loadParticipationState,
  mergeParticipationStates,
  saveParticipationState
} from "./utils/participation";
import {
  appendStatusHistoryEvent,
  buildSyntheticStatusHistory,
  createStatusEvent,
  mergeStatusHistoryMaps
} from "./utils/reportLifecycle";
import { updateStreak } from "./utils/streak";
import { buildObjectIndex, getObjectKeyFromReport } from "./utils/objectModel";
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
    submittedAt: report.submittedAt || createdAt,
    status: normalizeStatus(report.status)
  };

  return {
    ...normalizedReport,
    xpAwarded: Number.isFinite(report.xpAwarded) ? report.xpAwarded : calculateXP(normalizedReport)
  };
}

function getUserReputation(allReports, userId) {
  return allReports
    .filter((report) => String(report.userId) === String(userId))
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

function mergeStatusHistoryWithFallback(reports, remoteMap) {
  const syntheticMap = reports.reduce((acc, report) => {
    acc[report.id] = buildSyntheticStatusHistory(report);
    return acc;
  }, {});

  return mergeStatusHistoryMaps(syntheticMap, remoteMap || {});
}

function shouldUseLegacyParticipationFallback(errorCode) {
  const code = String(errorCode || "");

  if (!code) return false;

  return (
    code === "peer_action_unavailable" ||
    code.startsWith("peer_action_404") ||
    code.startsWith("peer_action_405") ||
    code.startsWith("peer_action_500") ||
    code.startsWith("peer_action_502") ||
    code.startsWith("peer_action_503")
  );
}

async function fetchCommunitySignals(reportIds = []) {
  const normalizedIds = Array.from(new Set(reportIds.map((value) => String(value || "").trim()).filter(Boolean)));
  if (!normalizedIds.length) {
    return {
      summaryByReport: {},
      events: [],
      available: false
    };
  }

  const responses = await Promise.all(
    normalizedIds.map(async (reportId) => {
      const result = await fetchReportCommunityActivity(reportId);
      return { reportId, result };
    })
  );

  const summaryByReport = {};
  const events = [];
  let availableCount = 0;

  responses.forEach(({ reportId, result }) => {
    if (!result?.activity) return;

    availableCount += 1;
    summaryByReport[reportId] = result.activity.summary || null;
    events.push(...toParticipationEvents(result.activity.recentActions));
  });

  return {
    summaryByReport,
    events,
    available: availableCount > 0
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("submission");
  const [user] = useState(getTelegramUser);
  const [reports, setReports] = useState(() => sampleReports.map(normalizeReport));
  const [participationState, setParticipationState] = useState(loadParticipationState);
  const [communitySummaryByReport, setCommunitySummaryByReport] = useState({});
  const [statusHistoryByReport, setStatusHistoryByReport] = useState({});
  const [reputationPoints, setReputationPoints] = useState(() => {
    const currentUser = getTelegramUser();
    const seededReports = sampleReports.map(normalizeReport);

    return getUserReputation(seededReports, currentUser.id);
  });
  const [lastXpEvent, setLastXpEvent] = useState(null);
  const [issueDetailId, setIssueDetailId] = useState("");
  const [objectDetailKey, setObjectDetailKey] = useState("");
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
          error: error?.message || "Failed to load GEOASR data"
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

    async function loadStoredReportsAndSignals() {
      let loadedReports = sampleReports.map(normalizeReport);
      const { reports: storedReports } = await fetchStoredReports();

      if (Array.isArray(storedReports)) {
        if (storedReports.length === 0) {
          await syncDemoReportsToSupabase();
          const reload = await fetchStoredReports();
          if (Array.isArray(reload.reports) && reload.reports.length) {
            loadedReports = reload.reports.map(normalizeReport);
          }
        } else {
          loadedReports = storedReports.map(normalizeReport);
        }
      }

      if (!active) return;

      setReports(loadedReports);
      setReputationPoints(getUserReputation(loadedReports, user.id));

      const reportIds = loadedReports.map((report) => report.id);
      const [communitySignals, legacyParticipation, remoteStatusHistory] = await Promise.all([
        fetchCommunitySignals(reportIds),
        fetchParticipationEvents(),
        fetchStatusHistory(reportIds)
      ]);

      if (!active) return;

      setCommunitySummaryByReport(communitySignals.summaryByReport || {});

      const combinedEvents = [
        ...(Array.isArray(communitySignals.events) ? communitySignals.events : []),
        ...(Array.isArray(legacyParticipation.events) ? legacyParticipation.events : [])
      ];

      if (combinedEvents.length) {
        const remoteParticipationState = buildParticipationStateFromEvents(combinedEvents);
        setParticipationState((prev) => mergeParticipationStates(prev, remoteParticipationState));
      }

      setStatusHistoryByReport(mergeStatusHistoryWithFallback(loadedReports, remoteStatusHistory.map || {}));
    }

    loadStoredReportsAndSignals();
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    saveParticipationState(participationState);
  }, [participationState]);

  useEffect(() => {
    setStatusHistoryByReport((prev) => {
      let next = prev;
      let changed = false;

      reports.forEach((report) => {
        if (Array.isArray(prev[report.id]) && prev[report.id].length > 0) return;

        const synthetic = buildSyntheticStatusHistory(report);
        next = mergeStatusHistoryMaps(next, { [report.id]: synthetic });
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [reports]);

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
      const summary = communitySummaryByReport[String(report.id)] || null;
      const summaryConfirmations = Number(summary?.confirm) || 0;
      const summaryEvidence = Number(summary?.evidence) || 0;
      const storedConfirmations = Number(report.confirmationsCount) || 0;
      const storedEvidence = Number(report.evidenceCount) || 0;

      return {
        ...report,
        confirmationsCount: Math.max(storedConfirmations, summaryConfirmations, participation.confirmationsCount),
        evidenceCount: Math.max(storedEvidence, summaryEvidence, participation.evidenceCount),
        latestEvidence: participation.latestEvidence,
        userParticipation: {
          hasConfirmed: participation.hasConfirmed,
          userEvidenceCount: participation.userEvidenceCount
        },
        isRepeatedIssue: repeatedReportIds.has(String(report.id))
      };
    });
  }, [communitySummaryByReport, participationState, repeatedReportIds, sortedReports, user.id]);

  const participationStats = useMemo(() => {
    return getUserParticipationStats(participationState, user.id, repeatedReportIds);
  }, [participationState, repeatedReportIds, user.id]);

  const objectIndex = useMemo(() => {
    return buildObjectIndex(reportsWithParticipation);
  }, [reportsWithParticipation]);

  const selectedIssue = useMemo(() => {
    if (!issueDetailId) return null;
    return reportsWithParticipation.find((report) => String(report.id) === String(issueDetailId)) || null;
  }, [issueDetailId, reportsWithParticipation]);

  const selectedObject = useMemo(() => {
    if (!objectDetailKey) return null;
    return objectIndex[objectDetailKey] || null;
  }, [objectDetailKey, objectIndex]);

  const selectedObjectReports = useMemo(() => {
    if (!selectedObject) return [];
    return selectedObject.reports || [];
  }, [selectedObject]);

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
      status: "Submitted",
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
    setStatusHistoryByReport((prev) =>
      appendStatusHistoryEvent(
        prev,
        hydratedReport.id,
        createStatusEvent({
          reportId: hydratedReport.id,
          status: "Submitted",
          note: "Report submitted",
          changedBy: user.id,
          createdAt
        })
      )
    );
    setReputationPoints((prev) => prev + xpGained);
    setLastXpEvent({
      id: `xp-${Date.now()}`,
      amount: xpGained,
      acknowledged: false,
      streakCount
    });
    setActiveTab("dashboard");

    void createStatusHistoryEvent({
      reportId: hydratedReport.id,
      status: "Submitted",
      note: "Report submitted",
      changedBy: user.id
    });

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

  const handleConfirmReport = async (reportId) => {
    if (!reportId) return { ok: false, message: "Invalid report." };

    const currentReport = reportsWithParticipation.find((report) => String(report.id) === String(reportId));
    if (!currentReport) return { ok: false, message: "Report not found." };
    if (String(currentReport.userId) === String(user.id)) {
      return { ok: false, message: "Self-confirmation is disabled." };
    }
    if (currentReport.userParticipation?.hasConfirmed) {
      return { ok: false, message: "You already confirmed this report." };
    }

    const actor = {
      telegramUserId: Number.isFinite(Number(user.id)) ? Number(user.id) : null,
      username: user.username || "",
      displayName: getReporterName(user)
    };

    const backendResult = await createReportPeerAction(reportId, {
      actionType: "confirm",
      actor
    });

    if (backendResult.action) {
      const remoteState = buildParticipationStateFromEvents([backendResult.action]);
      setParticipationState((prev) => mergeParticipationStates(prev, remoteState));

      if (backendResult.summary) {
        setCommunitySummaryByReport((prev) => ({
          ...prev,
          [String(reportId)]: backendResult.summary
        }));
      }

      return { ok: true, message: "Confirmation added." };
    }

    if (String(backendResult.error || "").includes("409")) {
      return { ok: false, message: "You already confirmed this report." };
    }

    if (!shouldUseLegacyParticipationFallback(backendResult.error)) {
      return { ok: false, message: "Unable to add confirmation right now." };
    }

    const localResult = addReportConfirmation(participationState, {
      reportId,
      userId: user.id
    });

    if (!localResult.added) {
      return { ok: false, message: "You already confirmed this report." };
    }

    setParticipationState(localResult.state || createEmptyParticipationState());

    const legacyResult = await createParticipationEvent({
      reportId,
      userId: user.id,
      actionType: "confirm"
    });

    if (legacyResult.event) {
      const remoteState = buildParticipationStateFromEvents([legacyResult.event]);
      setParticipationState((prev) => mergeParticipationStates(prev, remoteState));
      return { ok: true, message: "Confirmation added." };
    }

    return { ok: true, message: "Confirmation added (saved locally, remote sync unavailable)." };
  };

  const handleAddEvidence = async (reportId, note) => {
    if (!reportId) return { ok: false, message: "Invalid report." };
    const actor = {
      telegramUserId: Number.isFinite(Number(user.id)) ? Number(user.id) : null,
      username: user.username || "",
      displayName: getReporterName(user)
    };

    const backendResult = await createReportPeerAction(reportId, {
      actionType: "evidence",
      note,
      actor
    });

    if (backendResult.action) {
      const remoteState = buildParticipationStateFromEvents([backendResult.action]);
      setParticipationState((prev) => mergeParticipationStates(prev, remoteState));

      if (backendResult.summary) {
        setCommunitySummaryByReport((prev) => ({
          ...prev,
          [String(reportId)]: backendResult.summary
        }));
      }

      return { ok: true, message: "Evidence added." };
    }

    if (String(backendResult.error || "").includes("400")) {
      return { ok: false, message: "Evidence note is too short." };
    }

    if (!shouldUseLegacyParticipationFallback(backendResult.error)) {
      return { ok: false, message: "Unable to save evidence right now." };
    }

    const localResult = addReportEvidence(participationState, {
      reportId,
      userId: user.id,
      note
    });

    if (!localResult.added) {
      return { ok: false, message: "Evidence note is too short." };
    }

    setParticipationState(localResult.state || createEmptyParticipationState());

    const legacyResult = await createParticipationEvent({
      reportId,
      userId: user.id,
      actionType: "evidence",
      note
    });

    if (legacyResult.event) {
      const remoteState = buildParticipationStateFromEvents([legacyResult.event]);
      setParticipationState((prev) => mergeParticipationStates(prev, remoteState));
      return { ok: true, message: "Evidence added." };
    }

    return { ok: true, message: "Evidence added (saved locally, remote sync unavailable)." };
  };

  const handleAdvanceStatus = async (reportId, nextStatus) => {
    if (!reportId || !nextStatus) return { ok: false, message: "Invalid status update." };

    const normalizedNextStatus = normalizeStatus(nextStatus);

    setReports((prev) =>
      prev.map((report) => {
        if (String(report.id) !== String(reportId)) return report;
        return {
          ...report,
          status: normalizedNextStatus
        };
      })
    );

    const statusEvent = createStatusEvent({
      reportId,
      status: normalizedNextStatus,
      note: `Moved to ${normalizedNextStatus}`,
      changedBy: user.id
    });

    setStatusHistoryByReport((prev) => appendStatusHistoryEvent(prev, reportId, statusEvent));

    void updateStoredReportStatus(reportId, normalizedNextStatus);
    void createStatusHistoryEvent({
      reportId,
      status: normalizedNextStatus,
      note: `Moved to ${normalizedNextStatus}`,
      changedBy: user.id
    });

    return { ok: true, message: `Status moved to ${normalizedNextStatus}.` };
  };

  const handleOpenIssueDetail = (reportId) => {
    if (!reportId) return;
    setIssueDetailId(String(reportId));
    setObjectDetailKey("");
    setActiveTab("dashboard");
  };

  const handleOpenObjectFromReport = (reportId) => {
    const report = reportsWithParticipation.find((item) => String(item.id) === String(reportId));
    if (!report) return;

    const key = getObjectKeyFromReport(report);
    setObjectDetailKey(key);
    setIssueDetailId("");
    setActiveTab("dashboard");
  };

  const handleBackToDashboard = () => {
    setIssueDetailId("");
    setObjectDetailKey("");
    setActiveTab("dashboard");
  };

  const isDetailView = Boolean(selectedIssue || selectedObject);

  return (
    <div className="app-shell">
      <main className="content-shell">
        <div className="app-toolbar">
          <strong className="app-brand">Real Holat</strong>
          <LanguageSwitcher />
        </div>

        {selectedIssue ? (
          <IssueDetailPage
            report={selectedIssue}
            reports={reportsWithParticipation}
            statusHistory={statusHistoryByReport[selectedIssue.id] || buildSyntheticStatusHistory(selectedIssue)}
            onBack={handleBackToDashboard}
            onConfirmReport={handleConfirmReport}
            onAddEvidence={handleAddEvidence}
            onAdvanceStatus={handleAdvanceStatus}
            onOpenIssueDetail={handleOpenIssueDetail}
            onOpenObjectDetail={handleOpenObjectFromReport}
            currentUserId={user.id}
            geoAsrData={geoAsrState.data}
          />
        ) : null}

        {!selectedIssue && selectedObject ? (
          <ObjectDetailPage
            object={selectedObject}
            reports={selectedObjectReports}
            onBack={handleBackToDashboard}
            onOpenIssueDetail={handleOpenIssueDetail}
            onConfirmReport={handleConfirmReport}
            onAddEvidence={handleAddEvidence}
            currentUserId={user.id}
            geoAsrData={geoAsrState.data}
          />
        ) : null}

        {!isDetailView && activeTab === "submission" ? (
          <SubmitPage
            geoAsrData={geoAsrState.data}
            onSubmit={handleSubmitReport}
            onConfirmExistingIssue={handleConfirmReport}
            reports={reportsWithParticipation}
          />
        ) : null}

        {!isDetailView && activeTab === "dashboard" ? (
          <DashboardPage
            geoAsrData={geoAsrState.data}
            geoAsrError={geoAsrState.error}
            geoAsrLoading={geoAsrState.loading}
            onAddEvidence={handleAddEvidence}
            onConfirmReport={handleConfirmReport}
            onReportEnriched={handleReportEnriched}
            onOpenIssueDetail={handleOpenIssueDetail}
            onOpenObjectDetail={handleOpenObjectFromReport}
            onAdvanceStatus={handleAdvanceStatus}
            reports={reportsWithParticipation}
            reputationPoints={reputationPoints}
            user={user}
          />
        ) : null}

        {!isDetailView && activeTab === "profile" ? (
          <ProfilePage
            lastXpEvent={lastXpEvent}
            onAcknowledgeXpEvent={handleAcknowledgeXpEvent}
            onOpenIssueDetail={handleOpenIssueDetail}
            participationStats={participationStats}
            reports={reportsWithParticipation}
            reputationPoints={reputationPoints}
            user={user}
          />
        ) : null}
      </main>
      {!isDetailView ? <BottomNav activeTab={activeTab} onChange={setActiveTab} /> : null}
    </div>
  );
}
