const SITES = [
  "Bengaluru HQ",
  "Whitefield warehouse",
  "Peenya plant",
  "Hyderabad hub",
  "HITEC City office",
  "Pune plant 1",
  "Pune plant 2",
  "Chakan line",
  "Mumbai DC",
  "Andheri office",
  "Delhi hub",
  "Noida plant",
  "Gurugram office",
  "Chennai plant",
  "Sriperumbudur",
  "Kochi port",
  "Ahmedabad DC",
  "Jaipur site",
  "Lucknow field",
  "Indore plant",
  "Nagpur hub",
  "Bhopal yard",
  "Patna field",
  "Kolkata DC",
  "Bhubaneswar",
  "Vizag port",
  "Coimbatore",
  "Madurai",
  "Mysuru",
  "Hubballi",
  "Vadodara",
  "Surat DC",
  "Rajkot",
  "Nashik",
  "Aurangabad",
  "Kolhapur",
  "Kanpur",
  "Agra field",
  "Meerut",
  "Ranchi",
  "Jamshedpur",
  "Guwahati",
  "Shillong",
  "Chandigarh",
  "Ludhiana",
  "Amritsar",
  "Jammu",
  "Dehradun",
  "Haridwar",
  "Goa depot",
];

function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export type SitePulse = {
  id: number;
  name: string;
  headcount: number;
  present: number;
  method: "USSD" | "IVR" | "Kiosk" | "Supervisor";
  risk: "clear" | "watch" | "alert";
};

export function buildSites(): SitePulse[] {
  return Array.from({ length: 100 }, (_, index) => {
    const name = `${SITES[index % SITES.length]} ${Math.floor(index / SITES.length) + 1}`;
    const headcount = 6 + Math.floor(seeded(index + 3) * 12);
    const present = Math.max(0, headcount - Math.floor(seeded(index + 9) * 3));
    const ratio = present / headcount;
    const methods: SitePulse["method"][] = ["USSD", "IVR", "Kiosk", "Supervisor"];
    return {
      id: index + 1,
      name,
      headcount,
      present,
      method: methods[index % 4],
      risk: ratio > 0.92 ? "clear" : ratio > 0.8 ? "watch" : "alert",
    };
  });
}

export const IVR_SCRIPT = [
  { who: "Pulse", text: "Namaste. This is the VoxHire attendance line for Pune plant 2. Please say your employee number." },
  { who: "Worker", text: "Seven four one nine." },
  { who: "Pulse", text: "I heard 7419, Meena Pawar, packing shift A. Say haan to mark in, or nahi to try again." },
  { who: "Worker", text: "Haan." },
  { who: "Pulse", text: "Marked present at 08:11 from the plant landline. Have a good shift." },
];
