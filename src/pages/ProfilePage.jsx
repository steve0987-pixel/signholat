import { useMemo } from "react";
import ReportCard from "../components/ReportCard";

export default function ProfilePage({ user, reports }) {
  const userReports = useMemo(() => {
    return reports
      .filter((report) => report.userId === user.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports, user.id]);

  const points = userReports.reduce((total, report) => {
    if (report.status === "Resolved") return total + 20;
    if (report.status === "Verified") return total + 15;
    return total + 10;
  }, 0);

  return (
    <section className="tab-page">
      <header className="page-header">
        <h1>Profile</h1>
        <p>Your civic reporting activity.</p>
      </header>

      <section className="panel profile-header">
        <div className="avatar-circle">{(user.firstName || "U").slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{user.firstName} {user.lastName}</h2>
          <p>{user.username ? `@${user.username}` : "Telegram user"}</p>
        </div>
      </section>

      <section className="profile-stats">
        <article className="panel">
          <p className="stat-label">Submitted Reports</p>
          <strong>{userReports.length}</strong>
        </article>
        <article className="panel">
          <p className="stat-label">Reputation</p>
          <strong>{points} pts</strong>
        </article>
      </section>

      <section className="panel settings-placeholder">
        <h3>Settings</h3>
        <p>Notification and account settings can be added here later.</p>
      </section>

      <section className="report-list" aria-label="Your submitted reports">
        <h3 className="list-title">Your reports</h3>
        {userReports.length ? (
          userReports.map((report) => <ReportCard key={report.id} report={report} compact />)
        ) : (
          <div className="panel empty-state">You have not submitted reports yet.</div>
        )}
      </section>
    </section>
  );
}
