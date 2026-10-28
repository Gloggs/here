import DocPage from "../_landing/DocPage";

export const metadata = { title: "Terms | Here.", description: "The terms for using Here." };

export default function Terms() {
  return (
    <DocPage title="Terms of use" updated="28 October 2026">
      <p>Here. is a free personal project by Michael Ijisonuwe, built under the Guild UK name. It is not a registered company or a commercial service. By using it you agree to the following.</p>

      <h2>Provided as it is</h2>
      <p>Here. is free and comes with no warranty. It may change, go offline or close. There is no guaranteed uptime and no support agreement. Keep your own copy of anything important using the download options in Reports and Settings.</p>

      <h2>Not an official register</h2>
      <p>Here. is not a school information system and does not replace the statutory attendance register a school must keep. Use it alongside your school&apos;s own system, not instead of it.</p>

      <h2>Fair use</h2>
      <ul>
        <li>Only add records you are allowed to keep.</li>
        <li>Do not try to access other people&apos;s records, overload the service or test its security without permission. Report problems to <a href="mailto:michael@guilduk.com">michael@guilduk.com</a> instead.</li>
        <li>Do not add offensive content.</li>
      </ul>

      <h2>Your records</h2>
      <p>What you add belongs to you. You can download or delete it at any time from Settings. The privacy page explains what is stored and who handles it.</p>

      <h2>Connected apps</h2>
      <p>When you connect an app such as Zoho CRM, its own terms also apply. You can disconnect it at any time from the Apps page.</p>

      <h2>Limits</h2>
      <p>Each account can have up to 50 classes and 500 students. The demo and sandbox have lower limits.</p>

      <h2>Contact</h2>
      <p><a href="mailto:michael@guilduk.com">michael@guilduk.com</a></p>
    </DocPage>
  );
}
