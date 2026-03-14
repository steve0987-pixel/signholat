import React, { useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SubmitPage from "./pages/SubmitPage";
import { sampleReports } from "./data/sampleReports";

function getTelegramUser() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  if (tgUser) {
    return {
      id: tgUser.id,
      firstName: tgUser.first_name || "Citizen",
      lastName: tgUser.last_name || "",
      username: tgUser.username || ""
    };
  }

  return {
    id: 100,
    firstName: "Demo",
    lastName: "Citizen",
    username: "real_holat_user"
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("submission");
  const [user] = useState(getTelegramUser);
  const [reports, setReports] = useState(sampleReports);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports]);

  const handleSubmitReport = (payload) => {
    const newReport = {
      id: `r-${Date.now()}`,
      category: payload.category,
      description: payload.description,
      location: payload.location,
      placeName: payload.placeName,
      image: payload.image,
      submittedAt: new Date().toISOString(),
      status: "New",
      userId: user.id,
      reporterName: user.username ? `@${user.username}` : `${user.firstName} ${user.lastName}`.trim()
    };

    setReports((prev) => [newReport, ...prev]);
    setActiveTab("dashboard");
  };

  return (
    <div className="app-shell">
      <main className="content-shell">
        {activeTab === "submission" ? <SubmitPage onSubmit={handleSubmitReport} /> : null}
        {activeTab === "dashboard" ? <DashboardPage reports={sortedReports} /> : null}
        {activeTab === "profile" ? <ProfilePage user={user} reports={sortedReports} /> : null}
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
