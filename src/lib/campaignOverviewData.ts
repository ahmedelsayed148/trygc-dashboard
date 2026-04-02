// ─── Campaign Overview shared data layer ─────────────────────────────────────
// Shared types, seed data, and localStorage utilities used by both
// CampaignOverview (display) and the Configuration Manager (CRUD admin).

export interface CampaignRow {
  id: string;
  name: string;
  country: string;
  type: string;
  list: number;
  confirmations: number;
  target: number;
  visited: number;
  coverage: number;
  startDate: string;
  endDate: string;
}

export const CAMPAIGN_SEED: Omit<CampaignRow, "id">[] = [
  { name: "Sgh Ajman - Visit - Reels - UAE - Aug 2025", country: "United Arab Emirates", type: "Visit", list: 438, confirmations: 27, target: 25, visited: 23, coverage: 23, startDate: "2025-08-20", endDate: "2026-03-31" },
  { name: "Real Techniques - Visit - Highest Platform - KSA - Dec 2025", country: "Saudi Arabia", type: "Visit", list: 102, confirmations: 53, target: 5, visited: 24, coverage: 24, startDate: "2025-12-29", endDate: "2026-03-26" },
  { name: "Real Techniques - Visit - Oman - Jan 2026", country: "Oman", type: "Visit", list: 128, confirmations: 5, target: 2, visited: 4, coverage: 4, startDate: "2026-01-13", endDate: "2026-03-31" },
  { name: "Revlon - Visit - Highest Platform - Qatar - Jan 2026", country: "Qatar", type: "Visit", list: 98, confirmations: 5, target: 10, visited: 5, coverage: 4, startDate: "2026-01-12", endDate: "2026-03-31" },
  { name: "Dashe Beauty - Visit - Kuwait - Jan 2026", country: "Kuwait", type: "Visit", list: 49, confirmations: 6, target: 56, visited: 6, coverage: 6, startDate: "2026-01-15", endDate: "2026-03-31" },
  { name: "Hadayamall - Visit - TikTok - KSA - Jan 2026", country: "Saudi Arabia", type: "Visit", list: 454, confirmations: 175, target: 10, visited: 140, coverage: 136, startDate: "2026-01-19", endDate: "2026-03-19" },
  { name: "BFL - Visit - Ramadan - UAE - Feb 2026", country: "United Arab Emirates", type: "Visit", list: 516, confirmations: 13, target: 12, visited: 13, coverage: 12, startDate: "2026-02-02", endDate: "2026-03-18" },
  { name: "Tasali - Delivery - TikTok / Snap - KSA - Jan 2026", country: "Saudi Arabia", type: "Delivery", list: 112, confirmations: 16, target: 55, visited: 16, coverage: 10, startDate: "2026-01-22", endDate: "2026-03-31" },
  { name: "BFL - Visit - Ramadan - Bahrain - Feb 2026", country: "Bahrain", type: "Visit", list: 289, confirmations: 12, target: 10, visited: 12, coverage: 12, startDate: "2026-02-02", endDate: "2026-03-23" },
  { name: "BFL - Visit - Ramadan - Kuwait - Feb 2026", country: "Kuwait", type: "Visit", list: 258, confirmations: 9, target: 10, visited: 9, coverage: 9, startDate: "2026-02-02", endDate: "2026-03-23" },
  { name: "BFL - Visit - Ramadan - Oman - Feb 2026", country: "Oman", type: "Visit", list: 449, confirmations: 10, target: 10, visited: 10, coverage: 10, startDate: "2026-02-02", endDate: "2026-03-23" },
  { name: "BFL - Visit - Ramadan - Qatar - Feb 2026", country: "Qatar", type: "Visit", list: 195, confirmations: 10, target: 10, visited: 10, coverage: 10, startDate: "2026-02-02", endDate: "2026-03-23" },
  { name: "Creation Burger - Delivery - Kuwait - Jan 2026", country: "Kuwait", type: "Delivery", list: 61, confirmations: 8, target: 50, visited: 7, coverage: 7, startDate: "2026-02-02", endDate: "2026-03-31" },
  { name: "Flamingo Room - Visit - Highest Platform - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 1024, confirmations: 20, target: 250, visited: 18, coverage: 18, startDate: "2026-02-18", endDate: "2026-03-19" },
  { name: "Table To - Visit - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 244, confirmations: 222, target: 100, visited: 169, coverage: 160, startDate: "2026-02-18", endDate: "2026-03-19" },
  { name: "Samir & Aly - Visit - Reel - Egypt - Feb 2026", country: "Egypt", type: "Visit", list: 314, confirmations: 10, target: 15, visited: 9, coverage: 8, startDate: "2026-02-05", endDate: "2026-03-19" },
  { name: "Pablo & Abdo - Visit - Egypt - Feb 2026", country: "Egypt", type: "Visit", list: 2093, confirmations: 10, target: 50, visited: 7, coverage: 6, startDate: "2026-02-06", endDate: "2026-03-21" },
  { name: "Brunch & Cake - Visit - Highest Platform - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 1128, confirmations: 115, target: 500, visited: 83, coverage: 82, startDate: "2026-02-18", endDate: "2026-03-19" },
  { name: "R&B - Visit - Story / Reel - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 478, confirmations: 66, target: 100, visited: 53, coverage: 53, startDate: "2026-02-27", endDate: "2026-03-17" },
  { name: "Zuma - Visit - Highest Platform - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 138, confirmations: 134, target: 500, visited: 84, coverage: 83, startDate: "2026-02-18", endDate: "2026-03-19" },
  { name: "Insire - Visit - Highest Platform - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 1361, confirmations: 118, target: 400, visited: 72, coverage: 68, startDate: "2026-02-18", endDate: "2026-03-31" },
  { name: "Baco - Visit - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 36, confirmations: 0, target: 10, visited: 0, coverage: 0, startDate: "2026-02-18", endDate: "2027-02-04" },
  { name: "AOK Zalal - Visit - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 472, confirmations: 166, target: 174, visited: 64, coverage: 61, startDate: "2026-02-18", endDate: "2026-03-18" },
  { name: "BFL - Visit - Ramadan - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 197, confirmations: 20, target: 20, visited: 17, coverage: 17, startDate: "2026-02-20", endDate: "2026-03-18" },
  { name: "Farsi - Visit - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 15, confirmations: 0, target: 50, visited: 0, coverage: 0, startDate: "2026-02-19", endDate: "2026-03-31" },
  { name: "Elct.sa - Delivery - Highest Platform - KSA - Feb 2026", country: "Saudi Arabia", type: "Delivery", list: 300, confirmations: 76, target: 260, visited: 36, coverage: 34, startDate: "2026-02-24", endDate: "2026-03-31" },
  { name: "Tashas - Visit - Highest Platform - KSA - Feb 2026", country: "Saudi Arabia", type: "Visit", list: 352, confirmations: 33, target: 105, visited: 21, coverage: 21, startDate: "2026-02-25", endDate: "2026-03-17" },
  { name: "Malsa - Visit - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 244, confirmations: 6, target: 8, visited: 1, coverage: 1, startDate: "2026-03-01", endDate: "2026-03-17" },
  { name: "Kafy - Delivery - KSA - Mar 2026", country: "Saudi Arabia", type: "Delivery", list: 340, confirmations: 0, target: 100, visited: 0, coverage: 0, startDate: "2026-03-01", endDate: "2026-04-30" },
  { name: "Twaaet - Visit - Egypt - Mar 2026", country: "Egypt", type: "Visit", list: 8, confirmations: 0, target: 1, visited: 0, coverage: 0, startDate: "2026-03-04", endDate: "2026-03-27" },
  { name: "Dr. Cafe - Visit - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 178, confirmations: 0, target: 40, visited: 0, coverage: 0, startDate: "2026-03-12", endDate: "2026-03-19" },
  { name: "New Shanghai - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 339, confirmations: 67, target: 50, visited: 19, coverage: 19, startDate: "2026-03-10", endDate: "2026-03-17" },
  { name: "Dopeamine - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 183, confirmations: 26, target: 30, visited: 14, coverage: 12, startDate: "2026-03-10", endDate: "2026-03-17" },
  { name: "Venchi - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 337, confirmations: 84, target: 50, visited: 27, coverage: 24, startDate: "2026-03-10", endDate: "2026-03-17" },
  { name: "Splash Spectrum - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 397, confirmations: 73, target: 50, visited: 39, coverage: 29, startDate: "2026-03-10", endDate: "2026-03-17" },
  { name: "BFL - Visit - Eid - UAE - Mar 2026", country: "United Arab Emirates", type: "Visit", list: 81, confirmations: 5, target: 10, visited: 5, coverage: 5, startDate: "2026-03-12", endDate: "2026-03-20" },
  { name: "Dhahia Juice - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 300, confirmations: 22, target: 50, visited: 7, coverage: 3, startDate: "2026-03-10", endDate: "2026-03-17" },
  { name: "Alsaqeefa - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 305, confirmations: 13, target: 50, visited: 3, coverage: 3, startDate: "2026-03-10", endDate: "2026-03-17" },
  { name: "Real Techniques - Visit - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 189, confirmations: 10, target: 7, visited: 0, coverage: 0, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Real Techniques - Visit - Kuwait - Mar 2026", country: "Kuwait", type: "Visit", list: 32, confirmations: 2, target: 1, visited: 0, coverage: 0, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Real Techniques - Visit - Oman - Mar 2026", country: "Oman", type: "Visit", list: 46, confirmations: 2, target: 1, visited: 0, coverage: 0, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Real Techniques - Visit - UAE - Mar 2026", country: "United Arab Emirates", type: "Visit", list: 69, confirmations: 4, target: 8, visited: 0, coverage: 0, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Revlon - Visit - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 104, confirmations: 16, target: 24, visited: 5, coverage: 5, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Revlon - Visit - Kuwait - Mar 2026", country: "Kuwait", type: "Visit", list: 66, confirmations: 2, target: 1, visited: 1, coverage: 1, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Revlon - Visit - Oman - Mar 2026", country: "Oman", type: "Visit", list: 100, confirmations: 2, target: 1, visited: 0, coverage: 0, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Revlon - Visit - UAE - Mar 2026", country: "United Arab Emirates", type: "Visit", list: 204, confirmations: 2, target: 16, visited: 0, coverage: 0, startDate: "2026-03-13", endDate: "2026-03-18" },
  { name: "Black Goat - Visit - Solitaire - KSA - Mar 2026", country: "Saudi Arabia", type: "Visit", list: 109, confirmations: 6, target: 100, visited: 0, coverage: 0, startDate: "2026-03-15", endDate: "2026-03-18" },
  { name: "Honey Butter - Delivery - TikTok / Snap - KSA - Mar 2026", country: "Saudi Arabia", type: "Delivery", list: 529, confirmations: 0, target: 1000, visited: 0, coverage: 0, startDate: "2026-03-16", endDate: "2026-03-23" },
];

const STORAGE_KEY = "trygc-campaign-overview-data";

/** Custom event fired whenever campaigns are saved — lets CampaignOverview
 *  update in real-time even when the change comes from ConfigurationManager. */
export const CAMPAIGN_DATA_EVENT = "trygc:campaignOverviewDataChanged";

export function buildSeedWithIds(): CampaignRow[] {
  return CAMPAIGN_SEED.map((c, i) => ({ ...c, id: `seed-${i}` }));
}

export function loadCampaigns(): CampaignRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;   // allow empty array
    }
  } catch (error) {
    void error;
  }
  // First visit — start with seed data
  const seed = buildSeedWithIds();
  saveCampaigns(seed);
  return seed;
}

export function saveCampaigns(campaigns: CampaignRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    // Notify any mounted CampaignOverview instances immediately
    window.dispatchEvent(new CustomEvent(CAMPAIGN_DATA_EVENT));
  } catch (error) {
    void error;
  }
}
