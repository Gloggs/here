// The service worker (built with Serwist, the maintained successor to next-pwa).
// Its one job: keep the register usable with no signal. It keeps the app's own files, the dashboard pages,
// and the three answers the register needs (classes, today's marks, the overview). Every other request goes
// straight to the network and is never stored. Signing out or ending the demo deletes all of it (lib/outbox.js).
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkFirst, NetworkOnly, ExpirationPlugin } from "serwist";

const REGISTER_DATA = /^\/api\/(attendance|classes|overview)$/;
const TWO_DAYS = 2 * 24 * 60 * 60;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request, sameOrigin }) => sameOrigin && request.method === "GET" && REGISTER_DATA.test(url.pathname),
      handler: new NetworkFirst({ cacheName: "here-register", networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: TWO_DAYS })] }),
    },
    // Nothing else from the API is ever stored on the phone
    { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    {
      matcher: ({ url, request, sameOrigin }) => sameOrigin && request.mode === "navigate" && url.pathname.startsWith("/dashboard"),
      handler: new NetworkFirst({ cacheName: "here-pages", networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: TWO_DAYS })] }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
