import DocPage from "../_landing/DocPage";

export const metadata = { title: "Privacy | Here.", description: "What Here. stores, why, and how to download or delete it." };

export default function Privacy() {
  return (
    <DocPage title="Privacy" updated="28 October 2026">
      <h2>The short version</h2>
      <p>Here. stores the classes, students and attendance marks you add, so that you can use them. Nobody else who signs in can see them. You can download everything or delete it at any time from Settings.</p>
      <h2>What is stored</h2>
      <ul>
        <li><b>Your sign-in.</b> Handled by Kinde. Here. receives your name, email address and an account id. It never sees a password.</li>
        <li><b>What you add.</b> Class names, student names, optional contact numbers and addresses, attendance marks, reasons, notes and days off.</li>
        <li><b>Your theme choice.</b> Kept in your browser only.</li>
        <li><b>The demo.</b> Trying Here. without an account stores a random guest id in a cookie. The demo data is deleted after 24 hours, or straight away when you end the demo.</li>
      </ul>
      <p>There is no advertising, no tracking cookies and no selling of data.</p>
      <h2>Where it is kept</h2>
      <p>Records are stored in a Postgres database hosted by Neon. The app runs on Vercel. Every request is checked against your account id, so one account cannot read another&apos;s records.</p>
      <h2>Your choices</h2>
      <ul>
        <li><b>Download.</b> Settings, then Download all my data, gives you a complete copy as a file.</li>
        <li><b>Delete.</b> Settings, then Delete all my data, removes every class, student and mark straight away.</li>
      </ul>
      <h2>Using real student data</h2>
      <p>This is a portfolio project. If you are a school, check your own data protection policy before entering details of real pupils. The sample class uses made-up names.</p>
      <h2>Contact</h2>
      <p>Questions about this policy can go to Michael Ijisonuwe through the details on his CV or LinkedIn.</p>
    </DocPage>
  );
}
