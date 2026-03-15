import React, { useEffect, useMemo, useState } from "react";
import ReportCard from "../components/ReportCard";
import { STATUS_FLOW } from "../constants/statusLifecycle";
import { useI18n } from "../i18n/LanguageProvider";
import { computeBadges } from "../utils/badges";
import { getRank, getNextRank } from "../utils/ranks";
import { getStreak } from "../utils/streak";

function getTrustLabel(contributionScore) {
  if (contributionScore >= 90) return "Civic Steward";
  if (contributionScore >= 55) return "Reliable Contributor";
  if (contributionScore >= 28) return "Active Contributor";
  if (contributionScore >= 12) return "Emerging Contributor";
  return "New Participant";
}

export default function ProfilePage({
  user,
  reports,
  reputationPoints,
  participationStats,
  lastXpEvent,
  onAcknowledgeXpEvent,
  onOpenIssueDetail
}) {
  const { getBadgeLabel, getRankLabel, getStatusLabel, t } = useI18n();
  const userReports = useMemo(() => {
    return reports
      .filter((report) => report.userId === user.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports, user.id]);

  const [streakCount, setStreakCount] = useState(() => getStreak().streakCount);
  const [xpAnimation, setXpAnimation] = useState(null);

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const currentRank = useMemo(() => getRank(reputationPoints), [reputationPoints]);
  const nextRank = useMemo(() => getNextRank(reputationPoints), [reputationPoints]);
  const badges = useMemo(() => computeBadges(userReports, user.id), [userReports, user.id]);

  const progressPercent = useMemo(() => {
    if (!nextRank) return 100;

    const currentRange = nextRank.min - currentRank.min;
    const earnedWithinRank = reputationPoints - currentRank.min;

    return Math.max(0, Math.min(100, (earnedWithinRank / currentRange) * 100));
  }, [currentRank.min, nextRank, reputationPoints]);

  const pointsToNextRank = nextRank ? Math.max(nextRank.min - reputationPoints, 0) : 0;
  const resolvedCount = useMemo(() => userReports.filter((report) => report.status === "Resolved").length, [userReports]);
  const verifiedCount = useMemo(() => userReports.filter((report) => report.status === "Verified").length, [userReports]);
  const safeParticipationStats = participationStats || {
    confirmationsTotal: 0,
    evidenceTotal: 0,
    confirmationsThisWeek: 0,
    evidenceThisWeek: 0,
    repeatedParticipationsTotal: 0,
    repeatedParticipationsThisWeek: 0
  };

  const missions = useMemo(() => {
    return [
      {
        id: "community-confirm",
        title: "Weekly mission: 3 valid confirmations",
        progress: Math.min(safeParticipationStats.confirmationsThisWeek, 3),
        goal: 3
      },
      {
        id: "evidence-support",
        title: "Weekly mission: 2 evidence notes",
        progress: Math.min(safeParticipationStats.evidenceThisWeek, 2),
        goal: 2
      },
      {
        id: "repeated-surface",
        title: "Weekly mission: 2 repeated-issue assists",
        progress: Math.min(safeParticipationStats.repeatedParticipationsThisWeek, 2),
        goal: 2
      }
    ];
  }, [safeParticipationStats.confirmationsThisWeek, safeParticipationStats.evidenceThisWeek, safeParticipationStats.repeatedParticipationsThisWeek]);

  const completedMissionCount = useMemo(() => missions.filter((mission) => mission.progress >= mission.goal).length, [missions]);
  const statusTimeline = useMemo(() => {
    return STATUS_FLOW.map((statusKey) => ({
      statusKey,
      count: userReports.filter((report) => report.status === statusKey).length
    }));
  }, [userReports]);
  const contributionScore = useMemo(() => {
    return (
      safeParticipationStats.confirmationsTotal * 3 +
      safeParticipationStats.evidenceTotal * 5 +
      safeParticipationStats.repeatedParticipationsTotal * 4 +
      completedMissionCount * 10 +
      resolvedCount * 2 +
      verifiedCount
    );
  }, [
    completedMissionCount,
    resolvedCount,
    safeParticipationStats.confirmationsTotal,
    safeParticipationStats.evidenceTotal,
    safeParticipationStats.repeatedParticipationsTotal,
    verifiedCount
  ]);
  const trustLevel = useMemo(() => getTrustLabel(contributionScore), [contributionScore]);

  useEffect(() => {
    setStreakCount(getStreak().streakCount);
  }, [reports.length]);

  useEffect(() => {
    if (!lastXpEvent || lastXpEvent.acknowledged) return undefined;

    setXpAnimation(lastXpEvent);
    setStreakCount(getStreak().streakCount);
    onAcknowledgeXpEvent?.(lastXpEvent.id);

    const timeoutId = window.setTimeout(() => {
      setXpAnimation(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [lastXpEvent, onAcknowledgeXpEvent]);

  return (
    <section className="tab-page">
      <header className="page-header">
        <h1>{t("profile.title")}</h1>
        <p>{t("profile.subtitle")}</p>
      </header>

      <section className="panel profile-header">
        <div className="avatar-circle">{(user.firstName || "U").slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{fullName || t("common.telegramUser")}</h2>
          <p>{user.username ? `@${user.username}` : t("common.telegramUser")}</p>
        </div>
      </section>

      <section className="profile-stats">
        <article className="panel">
          <p className="stat-label">{t("profile.submittedReports")}</p>
          <strong>{userReports.length}</strong>
        </article>
        <article className="panel reputation-card">
          <div className="reputation-row">
            <div>
              <p className="stat-label">{t("profile.reputation")}</p>
              <strong>{reputationPoints} {t("common.pointsShort")}</strong>
            </div>
            {xpAnimation ? (
              <span key={xpAnimation.id} className="xp-gain-toast">
                +{xpAnimation.amount} XP
              </span>
            ) : null}
          </div>
        </article>
      </section>

      <section className="panel trust-panel">
        <div className="panel-title-row">
          <div>
            <h3>Contribution trust level</h3>
            <p>Built from consistent reports, confirmations, and resolved outcomes.</p>
          </div>
        </div>
        <div className="trust-metrics">
          <article className="trust-card">
            <span className="stat-label">Trust level</span>
            <strong>{trustLevel}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Contribution score</span>
            <strong>{contributionScore}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Missions completed</span>
            <strong>{completedMissionCount}</strong>
          </article>
        </div>
      </section>

      <section className="panel progression-panel">
        <div className="progression-header">
          <div>
            <p className="stat-label">{t("profile.currentRank")}</p>
            <strong className="rank-name" style={{ color: currentRank.color }}>
              {getRankLabel(currentRank.id)}
            </strong>
          </div>
          <div className="streak-card">
            <span className="stat-label">{t("profile.streak")}</span>
            <strong>{streakCount}</strong>
            <span>{t("profile.streakUnit")}</span>
          </div>
        </div>

        <div className="rank-progress-track" aria-label="Rank progression">
          <div
            className="rank-progress-fill"
            style={{ width: `${progressPercent}%`, backgroundColor: currentRank.color }}
          />
        </div>

        <p className="progression-copy">
          {nextRank
            ? t("profile.nextRankProgress", { count: pointsToNextRank, rank: getRankLabel(nextRank.id) })
            : t("profile.maxRankReached")}
        </p>
      </section>

      <section className="panel missions-panel">
        <div className="panel-title-row">
          <div>
            <h3>Weekly civic missions</h3>
            <p>Meaningful participation goals to improve local infrastructure visibility.</p>
          </div>
        </div>
        <div className="mission-grid">
          {missions.map((mission) => {
            const percent = Math.round((mission.progress / mission.goal) * 100);
            return (
              <article key={mission.id} className="mission-card">
                <strong>{mission.title}</strong>
                <div className="mission-progress-track">
                  <div className="mission-progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <span>
                  {mission.progress}/{mission.goal} completed
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel trust-panel">
        <div className="panel-title-row">
          <div>
            <h3>Participation stats</h3>
            <p>Rewards useful civic actions instead of raw report volume.</p>
          </div>
        </div>
        <div className="trust-metrics">
          <article className="trust-card">
            <span className="stat-label">Issue confirmations</span>
            <strong>{safeParticipationStats.confirmationsTotal}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Evidence notes</span>
            <strong>{safeParticipationStats.evidenceTotal}</strong>
          </article>
          <article className="trust-card">
            <span className="stat-label">Repeated issue assists</span>
            <strong>{safeParticipationStats.repeatedParticipationsTotal}</strong>
          </article>
        </div>
      </section>

      <section className="panel badges-panel">
        <div className="panel-title-row">
          <div>
            <h3>{t("profile.badges")}</h3>
            <p>{t("profile.unlockedCount", { count: badges.filter((badge) => badge.unlocked).length })}</p>
          </div>
        </div>

        <div className="badge-grid">
          {badges.map((badge) => (
            <article key={badge.id} className={`badge-card ${badge.unlocked ? "unlocked" : "locked"}`}>
              <span className="badge-state">{badge.unlocked ? t("profile.unlocked") : t("profile.locked")}</span>
              <strong>{getBadgeLabel(badge.id)}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel civic-transparency-note">
        <h3>Public participation transparency</h3>
        <p>
          Your contribution metrics are visible to strengthen trust, reduce duplicate noise, and support fair review by service operators.
        </p>
      </section>

      <section className="panel status-timeline-panel">
        <div className="panel-title-row">
          <div>
            <h3>Status lifecycle in your reports</h3>
            <p>Track movement from first submission to resolution.</p>
          </div>
        </div>
        <div className="status-timeline">
          {statusTimeline.map((item) => (
            <article key={item.statusKey} className={`timeline-step ${item.count ? "active" : ""}`}>
              <div className="timeline-row">
                <span className="status-badge">{getStatusLabel(item.statusKey)}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="timeline-track">
                <div className="timeline-fill" style={{ width: `${item.count ? Math.min(100, 20 + item.count * 18) : 0}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="report-list" aria-label={t("profile.yourReports")}>
        <h3 className="list-title">{t("profile.yourReports")}</h3>
        {userReports.length ? (
          userReports.map((report) => (
            <ReportCard
              key={report.id}
              allReports={reports}
              report={report}
              compact
              onOpenIssueDetail={onOpenIssueDetail}
            />
          ))
        ) : (
          <div className="panel empty-state">{t("profile.noReports")}</div>
        )}
      </section>
    </section>
  );
}
