export const profile = {
  name: "Arjun Subedi",
  role: "Software Engineer",
  employer: "BT Group",
  location: "Belfast, Northern Ireland",
  domain: "arjunsubedi.com",
  bio: "I build backend systems: Java and .NET microservices on AWS, large data migrations, and the tracing that shows what's happening in production. Eight years in, from Kathmandu to Belfast.",
  // Used for "years of experience" and terminal uptime.
  careerStart: "2018-08",
  email: "arjunsubedi@live.com",
  links: {
    github: "https://github.com/arjuntheguru",
    linkedin: "https://www.linkedin.com/in/arjunsubedi79",
  },
  offDuty: "guitar",
  certifications: ["Microsoft Certified: Azure Fundamentals"],
  skills: {
    "Languages & frameworks": ["Java", "Spring Boot", "C#", ".NET", "EF Core", "ASP.NET MVC", "Python", "JavaScript", "SQL", "HTML/CSS"],
    "Cloud & infrastructure": ["AWS", "Docker", "Kubernetes", "Linux", "CI/CD", "Git"],
    "Data & messaging": ["PostgreSQL", "SQL Server", "MongoDB", "Redis", "Kafka", "RabbitMQ", "SignalR", "Database design"],
    "Architecture & practice": ["Microservices", "Clean Architecture", "CQRS", "Design patterns", "TDD", "OpenTelemetry"],
    "Machine learning": ["LightGBM", "Gradient-boosted regression", "Feature engineering", "Backtesting"],
    "AI-assisted engineering": ["Kiro", "AI coding agents", "Context engineering"],
  } as Record<string, string[]>,
  // The system-info block shown when the terminal opens.
  neofetch: [
    ["Role", "Software Engineer, BT Group"],
    ["Location", "Belfast, Northern Ireland"],
    ["Runtime", "Java / Spring Boot, .NET / C#"],
    ["Cloud", "AWS (RDS, SQS, SNS), Docker, Kubernetes"],
    ["Messaging", "Kafka, RabbitMQ"],
    ["Tracing", "OpenTelemetry → Dynatrace"],
    ["ML", "LightGBM regression (Transio)"],
    ["Education", "MSc Advanced CS, Aberystwyth"],
  ] as [string, string][],
};

/** "2023-09", or "2023" when only the year is known. */
export type YearMonth = string;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

export function formatYM(ym: YearMonth | null): string {
  if (!ym) return "Present";
  const [y, m] = ym.split("-").map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}

/** Whole months from start to end inclusive; an open end counts up to now.
    Null when either end is only a year, since the length isn't known. */
export function monthsBetween(start: YearMonth, end: YearMonth | null, now = new Date()): number | null {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end ? end.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  if (!sm || !em) return null;
  return (ey - sy) * 12 + (em - sm) + 1;
}

export function formatDuration(months: number | null): string {
  if (months === null) return "";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y}y` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
}
