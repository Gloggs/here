import DocPage from "../_landing/DocPage";

export const metadata = { title: "Terms | Here.", description: "The terms for using Here." };

export default function Terms() {
  return (
    <DocPage title="Terms of use" updated="28 October 2026">
      <p>Here. is a free portfolio project made available as it is. By using it you agree to the following.</p>
      <h2>Fair use</h2>
      <ul>
        <li>Use it to keep attendance records you are entitled to keep.</li>
        <li>Do not try to access other people&apos;s records, overload the service or break its security.</li>
        <li>Do not add offensive content. Names and notes are checked for obvious abuse.</li>
      </ul>
      <h2>Your records</h2>
      <p>What you add belongs to you. You can download or delete it at any time from Settings. See the privacy page for details.</p>
      <h2>No guarantee</h2>
      <p>Here. is not an official school information system. It may change, go offline or be reset. Keep your own copy of anything important using the download options in Reports and Settings.</p>
      <h2>Limits</h2>
      <p>Each account can have up to 50 classes and 500 students.</p>
    </DocPage>
  );
}
