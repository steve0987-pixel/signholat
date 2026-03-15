const now = Date.now();

export const sampleReports = [
  {
    id: "r-1001",
    category: "No water",
    description:
      "Public toilet has no running water since morning. People cannot wash hands after use.",
    location: "Mustaqillik Street 12, Tashkent",
    placeName: "School No. 27 - Block B",
    image:
      "https://images.unsplash.com/photo-1531190867646-8c78f9d6f6aa?auto=format&fit=crop&w=900&q=80",
    submittedAt: new Date(now - 1000 * 60 * 45).toISOString(),
    status: "Submitted",
    userId: 11,
    reporterName: "@adilbek"
  },
  {
    id: "r-1002",
    category: "Broken sink",
    description:
      "Sink in the girls restroom is detached and leaking heavily onto the floor.",
    location: "Beruniy Avenue, Samarkand",
    placeName: "City Park Public Toilet",
    image:
      "https://images.unsplash.com/photo-1626315869436-d6781ba69d6b?auto=format&fit=crop&w=900&q=80",
    submittedAt: new Date(now - 1000 * 60 * 60 * 7).toISOString(),
    status: "Under Review",
    userId: 17,
    reporterName: "@malika"
  },
  {
    id: "r-1003",
    category: "Construction issue",
    description:
      "Open trench near a school gate without warning signs. Children are crossing nearby.",
    location: "Navoi Region, Zarafshan",
    placeName: "School No. 5 Entrance",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    submittedAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
    status: "In Progress",
    userId: 22,
    reporterName: "@sardor"
  },
  {
    id: "r-1004",
    category: "Safety issue",
    description:
      "Large uncovered manhole next to water point. Very dangerous at night.",
    location: "Andijan, Bobur district",
    placeName: "Public Water Point #3",
    image:
      "https://images.unsplash.com/photo-1472224371017-08207f84aaae?auto=format&fit=crop&w=900&q=80",
    submittedAt: new Date(now - 1000 * 60 * 60 * 40).toISOString(),
    status: "Resolved",
    userId: 9,
    reporterName: "@nilufar"
  },
  {
    id: "r-1005",
    category: "No soap",
    description:
      "Soap dispensers are empty in three toilet cabins at the local market.",
    location: "Chorsu Market, Tashkent",
    placeName: "Main Market Public Toilet",
    image:
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=80",
    submittedAt: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
    status: "Submitted",
    userId: 14,
    reporterName: "@javlon"
  }
];
