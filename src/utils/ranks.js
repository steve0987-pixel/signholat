export const RANKS = [
  { id: "observer", name: "Kuzatuvchi", min: 0, color: "#607084" },
  { id: "active", name: "Faol", min: 51, color: "#0b63e6" },
  { id: "guardian", name: "Qo\u02BBriqchi", min: 201, color: "#1d9b57" },
  { id: "leader", name: "Sarvar", min: 501, color: "#d58400" },
  { id: "legend", name: "Shahar afsonasi", min: 1200, color: "#cf3d4f" }
];

export function getRank(xp = 0) {
  return [...RANKS].reverse().find((rank) => xp >= rank.min) || RANKS[0];
}

export function getNextRank(xp = 0) {
  return RANKS.find((rank) => rank.min > xp) || null;
}
