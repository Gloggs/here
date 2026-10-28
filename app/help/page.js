import Link from "next/link";
import DocPage from "../_landing/DocPage";

export const metadata = { title: "Help | Here.", description: "How to use Here.: classes, taking the register, reports and your data." };

const FAQ = [
  ["How do I add my class?", <>Go to <b>Classes</b>, then <b>New class</b>. Give it a name and paste the student names, one per line. You can paste a column straight from Excel or Google Sheets.</>],
  ["How do I take the register?", <>On <b>Today</b>, press <b>Take register</b> on the class card. Tap <b>/</b> for present, <b>L</b> for late or <b>N</b> for absent. When you have marked the absences, press <b>Mark the other students present</b>. There is no save button, because every tap saves.</>],
  ["How do I change a mark?", <>Tap a different letter. To remove a mark completely, tap the student&apos;s name and choose <b>Clear mark</b>. You can also change any day from the <b>Month</b> tab.</>],
  ["Can I mark an earlier day?", <>Yes. Use the arrows beside the date, or tap a date in the <b>Month</b> tab to open that day&apos;s register.</>],
  ["What does the 90% line mean?", <>A student who misses 10% or more of sessions is counted as persistently absent by the Department for Education. Anyone below 90% is flagged on <b>Today</b> and in <b>Reports</b>.</>],
  ["Does late count as present?", <>Yes. Late counts towards attendance, but it is shown separately so you can spot patterns.</>],
  ["How do I stop half term counting?", <>In <b>Reports</b>, add the dates under <b>Days off</b>. Those days are left out of every percentage.</>],
  ["How do I move a student to another class?", <>Open the student, press <b>Edit details</b> and choose the new class.</>],
  ["Can other people see my students?", <>No. Every account is private. Someone else who signs in starts with an empty register. See <Link href="/privacy">Privacy</Link>.</>],
  ["How do I get my data out?", <>In <b>Reports</b>, download a summary or every mark as a spreadsheet, or print the page. In <b>Settings</b>, download everything in your account as one file.</>],
  ["How do I add a photo?", <>Open the student and press the pencil on their picture. Confirm you have consent, then take a photo or upload one, drag and zoom to frame it, and save. Photos are made small and private before they leave your device.</>],
  ["How do points work?", <>On a class&apos;s <b>Points</b> tab, tap a face, or <b>Whole class</b>, and choose a behaviour. Each is worth +1 or -1, and you can undo straight away. Change the list in the class&apos;s <b>Settings</b>.</>],
  ["What is the class goal?", <>A weekly attendance target the whole class works towards, with a reward you choose. Set it in the class&apos;s <b>Settings</b>. Here. celebrates full weeks and improvement, and never ranks pupils by attendance.</>],
  ["Can I track work, not just attendance?", <>Yes. Every group has a <b>Tasks</b> tab. Set a task with a due date, then mark each person done, late or not done, and their share of the work. Here. shows who is doing what over time. Set a group to <b>Team</b> in Settings and it opens on its tasks.</>],
  ["What is in the toolkit?", <>Press <b>Tools</b> on a class page to pick a name from the people here today, split them into random groups, or run a timer.</>],
  ["What is the sandbox?", <>A second space next to your real register, filled with a sample class. Switch with the <b>My register</b> and <b>Sandbox</b> tabs at the top, or press <b>Ctrl + Alt</b> and an arrow key. Use <b>Sandbox tools</b> to fill in a day, simulate a bad week or reset it. Nothing you do there reaches your real classes.</>],
];

export default function Help() {
  return (
    <DocPage title="Help">
      <p>Here. keeps a simple, private attendance record for each of your classes. Here is how to get the most from it.</p>
      <h2 id="faq">Common questions</h2>
      {FAQ.map(([q, a]) => (
        <details key={q} className="l-faq">
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
      <h2 id="codes">Register codes</h2>
      <p>The app uses the same marks as paper registers in English schools, so the month view reads like the register you already know.</p>
      <table className="l-table">
        <thead><tr><th>Code</th><th>Meaning</th><th>Counts as</th></tr></thead>
        <tbody>
          <tr><td><b>/</b></td><td>Present</td><td>Attending</td></tr>
          <tr><td><b>L</b></td><td>Late, arrived before the register closed</td><td>Attending</td></tr>
          <tr><td><b>I</b></td><td>Illness</td><td>Absent, with a reason</td></tr>
          <tr><td><b>M</b></td><td>Medical or dental appointment</td><td>Absent, with a reason</td></tr>
          <tr><td><b>H</b></td><td>Holiday</td><td>Absent, with a reason</td></tr>
          <tr><td><b>N</b></td><td>No reason yet</td><td>Absent, needs following up</td></tr>
        </tbody>
      </table>
      <h2 id="shortcuts">Keyboard shortcuts</h2>
      <p>On a computer, while taking the register:</p>
      <ul>
        <li><kbd>↓</kbd> or <kbd>J</kbd> moves to the next student, and <kbd>↑</kbd> or <kbd>K</kbd> moves to the previous one.</li>
        <li><kbd>/</kbd>, <kbd>L</kbd> or <kbd>N</kbd> marks the highlighted student and moves on. <kbd>P</kbd> and <kbd>A</kbd> also work.</li>
        <li><kbd>Esc</kbd> closes the reasons panel.</li>
      </ul>
      <h2>On your phone</h2>
      <p>Open the site in your phone&apos;s browser and choose <b>Add to Home Screen</b>. Here. then opens like an app.</p>
      <p><Link className="r-btn" href="/dashboard">Open the app</Link></p>
    </DocPage>
  );
}
