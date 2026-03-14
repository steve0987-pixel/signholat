import { formatDateTime, shortText, statusToTone } from "../utils/reportUtils";

export default function ReportCard({ report, compact = false }) {
  return (
    <article className={`report-card ${compact ? "compact" : ""}`}>
      <img className="report-image" src={report.image} alt={report.category} loading="lazy" />
      <div className="report-content">
        <div className="report-top-row">
          <span className="category-pill">{report.category}</span>
          <span className={`status-badge ${statusToTone(report.status)}`}>{report.status}</span>
        </div>
        <h3 className="place-title">{report.placeName}</h3>
        <p className="report-description">{compact ? shortText(report.description, 68) : shortText(report.description)}</p>
        <div className="meta-grid">
          <span>{report.location}</span>
          <span>{formatDateTime(report.submittedAt)}</span>
        </div>
      </div>
    </article>
  );
}
