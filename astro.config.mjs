// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://arjunsubedi.com",
  build: {
    // index.html, 404.html, 503.html: flat files that nginx can point error_page at.
    format: "file",
    // Keep CSS inside each page, so the 503 page works when nothing else can be fetched.
    inlineStylesheets: "always",
  },
});
