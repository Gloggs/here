// The sample CRM: made-up contacts, so anyone can try linking, importing and sending
// without connecting a real CRM. Everything here is invented.
export const DEMO_CONTACTS = [
  ["d01", "Zainab Ali", "07700 900101", ["Spring intake"]],
  ["d02", "Marcus Bell", "07700 900102", ["Spring intake"]],
  ["d03", "Priya Raman", "07700 900103", ["Spring intake"]],
  ["d04", "Tomasz Kowalski", "07700 900104", ["Spring intake"]],
  ["d05", "Aisha Mohammed", "07700 900105", ["Spring intake", "Funded place"]],
  ["d06", "Callum Reid", "07700 900106", ["Spring intake"]],
  ["d07", "Naledi Dlamini", "07700 900107", ["Evening class"]],
  ["d08", "Oliver Grant", "07700 900108", ["Evening class"]],
  ["d09", "Fatima Hussain", "07700 900109", ["Evening class", "Funded place"]],
  ["d10", "Rafael Santos", "07700 900110", ["Evening class"]],
  ["d11", "Eilidh Campbell", "07700 900111", ["Weekend school"]],
  ["d12", "Kwame Boateng", "07700 900112", ["Weekend school", "Funded place"]],
].map(([id, name, phone, tags]) => ({ id, name, phone, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, tags }));

export const DEMO_IDS = new Set(DEMO_CONTACTS.map((c) => c.id));
export const demoContact = (id) => DEMO_CONTACTS.find((c) => c.id === id) || null;
