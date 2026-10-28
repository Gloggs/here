// Lets phones install Register to the home screen and open it like an app.
export default function manifest() {
  return {
    name: "Here. Class register",
    short_name: "Here.",
    description: "A simple, private class register: mark attendance, spot patterns and export reports.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F1F0",
    theme_color: "#262220",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
