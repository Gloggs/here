// Plain-text attendance messages, shared by the Zoho note and the message-a-parent buttons.
const pctText = (p) => (p == null ? "no marks yet" : `${p}%`);

export function attendanceNote(student, summary, todayIso) {
  return {
    title: `Attendance: ${student.name}, ${todayIso}`,
    body: [
      `${student.name} (${student.className}). Attendance this school year: ${pctText(summary.pct)}.`,
      `${summary.marked} sessions marked: ${summary.present} present, ${summary.late} late, ${summary.absent} absent${summary.unexplained ? `, ${summary.unexplained} with no reason given` : ""}.`,
      "Sent from Here.",
    ].join("\n"),
  };
}

/** A short, friendly note to a parent or carer about an absence. */
export function absenceMessage(studentName, className, dateText) {
  const first = String(studentName).split(" ")[0];
  return `Hi, this is about ${first} from ${className}. ${first} was marked absent on ${dateText}. Could you let me know the reason when you get a chance? Thank you.`;
}

/** wa.me only takes digits with a country code. UK numbers starting 0 become 44. */
export function whatsappNumber(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.slice(1).replace(/\D/g, "") || null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `44${digits.slice(1)}`;
  return digits;
}
