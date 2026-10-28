import DocPage from "../_landing/DocPage";

export const metadata = { title: "Privacy | Here.", description: "What Here. stores, who handles it, and how to download or delete it." };

export default function Privacy() {
  return (
    <DocPage title="Privacy" updated="28 October 2026">
      <h2>The short version</h2>
      <p>Here. stores the classes, students and marks you add, so that you can use them. Nobody else who signs in can see them. Nothing is sent to another app unless you connect it yourself. You can download or delete everything at any time from Settings.</p>

      <h2>Who runs Here.</h2>
      <p>Here. is a personal project by Michael Ijisonuwe, built under the Guild UK name. It is not a registered company or a commercial service. Under UK data protection law, Michael is still the person responsible for the data stored in it, and you can contact him at <a href="mailto:michael@guilduk.com">michael@guilduk.com</a>.</p>

      <h2>What is stored</h2>
      <ul>
        <li><b>Your sign-in.</b> Handled by Kinde. Here. receives your name, email address and an account id. It never sees a password.</li>
        <li><b>The name you choose.</b> If you set one in Settings, it replaces the name from your sign-in.</li>
        <li><b>What you add.</b> Class names, student names, optional contact numbers and addresses, attendance marks and reasons, notes, behaviour points, tasks and who did them, and days off.</li>
        <li><b>Photos.</b> Only if you add them and tick consent. They are resized in your browser and location data is removed before upload.</li>
        <li><b>The sandbox.</b> A separate practice space under your account. It starts with made-up names and is deleted with your account.</li>
        <li><b>The demo.</b> Trying Here. without an account stores a random guest id in a cookie. Demo data is deleted after 24 hours, or straight away when you end the demo.</li>
        <li><b>Your theme and a few layout choices.</b> Kept in your browser only.</li>
      </ul>
      <p>There is no advertising, no tracking cookies and no selling of data. The only cookies are for signing in, the demo, and which space you are in.</p>

      <h2>Who handles it</h2>
      <ul>
        <li><b>Vercel</b> runs the app.</li>
        <li><b>Neon</b> hosts the Postgres database.</li>
        <li><b>Kinde</b> handles sign-in.</li>
        <li><b>Cloudflare</b> manages the guilduk.com domain.</li>
      </ul>
      <p>Every request is checked against your account id, so one account cannot read another&apos;s records.</p>

      <h2>Connected apps</h2>
      <p>Apps are off until you connect them from the Apps page. Connecting sends you to that company to approve access. Here. never sees your password for it.</p>
      <ul>
        <li><b>Zoho CRM.</b> Here. can read your Contacts, so you can link a student to one or import students from them. When you press a button it can add a note, update three attendance fields, or create a check-in Task on a Contact. It cannot see deals, emails or other records, and it writes nothing to Zoho until you press the button or approve the Task.</li>
        <li><b>WhatsApp and email.</b> The Message buttons open your own WhatsApp or email app with a note filled in. Nothing is sent until you send it there, and Here. does not connect to either service.</li>
        <li><b>YouTube and Spotify.</b> Videos and playlists you open in the music player play from those sites, which apply their own privacy terms. YouTube is loaded in its privacy-enhanced mode. The last link you played is remembered in your browser only.</li>
        <li><b>Sample CRM.</b> In the sandbox and the demo, a made-up CRM shows how the Zoho connection works. What you send it stays in your browser and never reaches a real CRM or our database.</li>
      </ul>
      <p>Connection keys are encrypted before they are stored and are never sent to your browser. Disconnecting an app, or deleting your account, cancels its access with that company and removes the key.</p>

      <h2>How long it is kept</h2>
      <p>Your records stay until you delete them or your account. Demo data is removed after 24 hours.</p>

      <h2>Your choices</h2>
      <ul>
        <li><b>Download.</b> Settings, then Download all my data, gives you a complete copy as a file.</li>
        <li><b>Delete.</b> Settings, then Delete all my data, removes every class, student and mark in your register and sandbox straight away, and disconnects your apps.</li>
        <li><b>Ask.</b> Email <a href="mailto:michael@guilduk.com">michael@guilduk.com</a> to ask what is held about you, or to have it corrected or removed.</li>
      </ul>

      <h2>Using real student data</h2>
      <p>If you are a school or a teacher, check your own data protection policy before entering details of real pupils, and before connecting an app such as Zoho. The sample class and the sandbox use made-up names.</p>

      <h2>Security</h2>
      <p>Signed-in pages and data are only served over HTTPS. Every part of the app checks who is asking before it returns anything. The full details are in the security policy in the project&apos;s public code.</p>

      <h2>Changes</h2>
      <p>If this page changes, the date at the top changes with it.</p>
    </DocPage>
  );
}
