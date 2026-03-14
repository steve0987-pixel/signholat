import { useMemo, useState } from "react";
import ReportCard from "../components/ReportCard";
import StatsBar from "../components/StatsBar";
import { CATEGORIES, DATE_FILTERS, STATUS_OPTIONS } from "../constants/options";
import { getDateThreshold } from "../utils/reportUtils";

export default function DashboardPage({ reports }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filteredReports = useMemo(() => {
    const threshold = getDateThreshold(dateFilter);
    const keyword = search.trim().toLowerCase();

    return reports
      .filter((report) => {
        if (category !== "all" && report.category !== category) return false;
        if (status !== "all" && report.status !== status) return false;
        if (threshold && new Date(report.submittedAt).getTime() < threshold) return false;
        if (!keyword) return true;

        const searchableText = `${report.category} ${report.description} ${report.location} ${report.placeName}`.toLowerCase();
        return searchableText.includes(keyword);
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports, search, category, status, dateFilter]);

  return (
    <section className="tab-page">
      <header className="page-header">
        <h1>Public Dashboard</h1>
        <p>Every report is publicly visible for transparency and accountability.</p>
      </header>

      <StatsBar reports={reports} />

      <div className="panel filter-panel">
        <input
          type="search"
          placeholder="Search reports"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-grid">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              {DATE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="report-list" aria-label="All public reports">
        {filteredReports.length ? (
          filteredReports.map((report) => <ReportCard key={report.id} report={report} />)
        ) : (
          <div className="panel empty-state">No reports match the current filters.</div>
        )}
      </section>
    </section>
  );
}
