import { formatYM, monthsBetween, formatDuration } from "../data/profile";

type Work = {
  id: string; org: string; role: string; where?: string;
  start: string; end: string | null; note?: string; highlights: string[]; tags: string[];
};
type Data = {
  profile: {
    name: string; domain: string; employer: string; location: string; email: string;
    offDuty: string; certifications: string[]; links: Record<string, string>; skills: Record<string, string[]>;
  };
  work: Work[];
  education: { role: string; org: string; start: string; end: string | null }[];
  projects: { name: string; url?: string; summary: string; tags: string[] }[];
};

const THEMES = ["amber", "ice", "green"] as const;
type ThemeName = (typeof THEMES)[number];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");
const link = (url: string) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(bare(url))}</a>`;

export function mountTerminal() {
  const term = document.getElementById("terminal");
  const raw = document.getElementById("terminal-data");
  if (!term || !raw) return;
  const data: Data = JSON.parse(raw.textContent!);
  const { profile } = data;
  const screen = term.querySelector<HTMLElement>("[data-screen]")!;
  const log = term.querySelector<HTMLElement>("[data-log]")!;
  const input = term.querySelector<HTMLInputElement>("[data-input]")!;
  const prompt = `<span class="ok">guest@${profile.domain}</span>:<span class="hi">~</span>$`;
  term.querySelector("[data-last-login]")!.textContent = new Date().toDateString();

  // ---- theme
  const setTheme = (t: ThemeName) => {
    term.dataset.themeName = t;
    term.querySelectorAll<HTMLButtonElement>("[data-term-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.termTheme === t)));
    try { localStorage.setItem("terminal-theme", t); } catch {}
  };
  let saved: string | null = null;
  try { saved = localStorage.getItem("terminal-theme"); } catch {}
  setTheme(THEMES.includes(saved as ThemeName) ? (saved as ThemeName) : "amber");
  term.querySelectorAll<HTMLButtonElement>("[data-term-theme]").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.termTheme as ThemeName)));

  // ---- open / close
  let returnFocus: HTMLElement | null = null;
  const open = () => {
    if (!term.hidden) return;
    returnFocus = document.activeElement as HTMLElement | null;
    term.hidden = false;
    document.body.style.overflow = "hidden";
    input.focus({ preventScroll: true });
  };
  const close = () => {
    term.hidden = true;
    document.body.style.overflow = "";
    if (location.hash === "#terminal") history.replaceState(null, "", location.pathname);
    returnFocus?.focus({ preventScroll: true });
  };
  document.querySelectorAll("[data-open-terminal]").forEach((b) => b.addEventListener("click", open));
  term.querySelector("[data-close-terminal]")!.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
    if (term.hidden && !typing && (e.key === "`" || e.key === "~")) { e.preventDefault(); open(); }
    else if (!term.hidden && e.key === "Escape") close();
  });
  if (location.hash === "#terminal") open();
  addEventListener("hashchange", () => { if (location.hash === "#terminal") open(); });

  // ---- commands
  const pad = (s: string, n: number) => s.padEnd(n);
  const work = (id: string) => data.work.find((w) => w.id === id);
  const commands: Record<string, () => string> = {
    help: () => `<span class="hi">commands</span>
  whoami            short intro
  experience        work history        (alias: ls work)
  cat &lt;id&gt;          one role in detail, e.g. <span class="hi">cat ${data.work[0]?.id}</span>
  projects          things I've built
  skills            what I work with
  education         degrees and certifications
  contact           how to reach me
  theme [name]      ${THEMES.join(", ")}
  sudo hire-me      try it
  clear             clear the screen
  exit              back to the normal site`,
    whoami: () => `${esc(profile.name)}. Software engineer at ${esc(profile.employer)}, based in ${esc(profile.location.split(",")[0])}.
I build backend systems: Java and .NET microservices on AWS, large
data migrations, and the tracing that shows what's going on in prod.
When I'm not coding I play ${esc(profile.offDuty)} (I'm better at coding).`,
    experience: () =>
      data.work.map((w) => `<span class="dim">${pad(formatYM(w.start), 10)}→ ${pad(formatYM(w.end), 10)}</span> <span class="hi">${pad(w.id, 12)}</span>${esc(w.role)}, ${esc(w.org)}`).join("\n") +
      `\n\n<span class="dim">tip: cat &lt;id&gt; for details</span>`,
    projects: () => data.projects.map((p) => `<span class="hi">${esc(p.name)}</span>${p.url ? `  ${link(p.url)}` : ""}\n  ${esc(p.summary)}\n  <span class="dim">${p.tags.map(esc).join(" · ")}</span>`).join("\n\n"),
    skills: () => Object.entries(profile.skills).map(([k, v]) => `<span class="hi">${esc(k)}</span>\n  ${v.map(esc).join(", ")}`).join("\n"),
    education: () =>
      data.education.map((e) => `<span class="hi">${esc(e.role)}</span>  ${esc(e.org)}  <span class="dim">${formatYM(e.start)} – ${formatYM(e.end)}</span>`).join("\n") +
      "\n" + profile.certifications.map((c) => `<span class="hi">${esc(c)}</span>`).join("\n"),
    contact: () => `email     ${esc(profile.email)}
github    ${link(profile.links.github)}
linkedin  ${link(profile.links.linkedin)}`,
    "sudo hire-me": () => `[sudo] password for recruiter: ********
<span class="ok">✓ permission granted.</span> Email ${esc(profile.email)} and mention the terminal.`,
    ls: () => `about.md  work/  projects/  skills.json  contact.txt`,
  };
  commands["ls work"] = commands.experience;
  commands["cat about.md"] = commands.whoami;
  commands["cat contact.txt"] = commands.contact;
  commands["cat skills.json"] = commands.skills;

  function respond(cmd: string): string | null {
    if (!cmd) return "";
    if (commands[cmd]) return commands[cmd]();
    if (cmd === "theme" || cmd.startsWith("theme ")) {
      const t = cmd.split(" ")[1];
      if (!t) return `current: <span class="hi">${term!.dataset.themeName}</span>\navailable: ${THEMES.join(", ")}\nusage: theme green`;
      if (!THEMES.includes(t as ThemeName)) return `theme: unknown theme '${esc(t)}'. Try ${THEMES.join(", ")}.`;
      setTheme(t as ThemeName);
      return `<span class="ok">theme set to ${t}</span>`;
    }
    if (cmd.startsWith("cat ")) {
      const id = cmd.slice(4).replace(/^work\//, "");
      const w = work(id);
      if (!w) return `cat: ${esc(id)}: No such file. Try: ${data.work.map((x) => x.id).join(", ")}`;
      return `<span class="hi">${esc(w.role)} · ${esc(w.org)}</span>
<span class="dim">${[`${formatYM(w.start)} → ${formatYM(w.end)}`, formatDuration(monthsBetween(w.start, w.end)), w.where ? esc(w.where) : ""].filter(Boolean).join(" · ")}</span>
${w.note ? `<span class="dim">${esc(w.note)}</span>\n` : ""}${w.highlights.map((h) => `  - ${esc(h)}`).join("\n")}
  <span class="dim">${w.tags.map(esc).join(" · ")}</span>`;
    }
    if (cmd.startsWith("sudo")) return `guest is not in the sudoers file. This incident will be reported.`;
    return `command not found: ${esc(cmd.split(" ")[0])}. Type <span class="hi">help</span>.`;
  }

  function run(rawCmd: string) {
    const cmd = rawCmd.trim().replace(/\s+/g, " ");
    if (cmd === "clear") { log.innerHTML = ""; return; }
    if (cmd === "exit") { close(); return; }
    const out = respond(cmd);
    const block = document.createElement("div");
    block.className = "block";
    block.innerHTML = `<div>${prompt} ${esc(cmd)}</div>${out ? `<div class="out">${out}</div>` : ""}`;
    log.appendChild(block);
    screen.scrollTop = screen.scrollHeight;
  }

  const past: string[] = [];
  let cursor = 0;
  const completions = () => [
    ...Object.keys(commands), "clear", "exit", "education",
    ...THEMES.map((t) => `theme ${t}`), ...data.work.map((w) => `cat ${w.id}`),
  ];
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      run(input.value);
      if (input.value.trim()) past.push(input.value);
      cursor = past.length;
      input.value = "";
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cursor > 0) input.value = past[--cursor];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor < past.length - 1) input.value = past[++cursor];
      else { cursor = past.length; input.value = ""; }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const matches = [...new Set(completions())].filter((c) => c.startsWith(input.value));
      if (matches.length === 1) input.value = matches[0];
      else if (matches.length > 1) {
        const hint = document.createElement("div");
        hint.className = "block out dim";
        hint.textContent = matches.join("   ");
        log.appendChild(hint);
        screen.scrollTop = screen.scrollHeight;
      }
    }
  });
  screen.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    if (!getSelection()?.toString()) input.focus({ preventScroll: true });
  });
  term.querySelectorAll<HTMLButtonElement>("[data-cmd]").forEach((b) => b.addEventListener("click", () => run(b.dataset.cmd!)));

  run("whoami");
}
