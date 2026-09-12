export const DISTRICTS = [
  {
    id: "jamnagar",
    name: "Jamnagar",
    state: "Gujarat",
    lat: 22.36,
    lon: 69.87,
    bbox: [69.5, 21.8, 70.8, 22.9],
    focus: "Coastal industry",
    description:
      "Examine thermal signals around an industrial coastal landscape. Check the measurements before assigning a source.",
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    lat: 23.03,
    lon: 72.58,
    bbox: [71.8, 22.3, 73.1, 23.6],
    focus: "Urban–industrial interface",
    description:
      "Review observations in a dense urban and industrial setting, using confidence, timing and review history for context.",
  },
  {
    id: "ludhiana",
    name: "Ludhiana",
    state: "Punjab",
    lat: 30.91,
    lon: 75.85,
    bbox: [75.3, 30.4, 76.5, 31.2],
    focus: "Agriculture & industry",
    description:
      "Investigate signals across agricultural and industrial land. A satellite hotspot alone cannot identify the cause.",
  },
  {
    id: "dhanbad",
    name: "Dhanbad",
    state: "Jharkhand",
    lat: 23.78,
    lon: 86.42,
    bbox: [86, 23.4, 86.9, 24.1],
    focus: "Coalfield landscape",
    description:
      "Inspect clustered observations and their FRP measurements. Recurrence in this short window is evidence, not proof of a persistent fire.",
  },
];
export function restoreManager() {
  try {
    const item = JSON.parse(sessionStorage.getItem("tg_demo_manager_v1"));
    return item &&
      DISTRICTS.some((d) => d.id === item.districtId) &&
      typeof item.name === "string" &&
      item.name.length <= 60
      ? item
      : null;
  } catch {
    return null;
  }
}
