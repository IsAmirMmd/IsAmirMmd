// Fetches the numbers for the stats tiles into bento/src/stats.json: contributions by day from
// GitHub's GraphQL API (GITHUB_TOKEN), the streaks worked out from them, and the profile views
// from komarev's counter. Run by .github/workflows/stats.yml before build.mjs.
//   GITHUB_TOKEN=… node bento/stats.mjs
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const USER = "IsAmirMmd";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is not set");

const gql = async (query, variables) => {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
};

const { user } = await gql(`query($login: String!) { user(login: $login) { createdAt } }`, { login: USER });
const days = [];
const now = new Date();
for (let year = new Date(user.createdAt).getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
  const data = await gql(
    `query($login: String!, $from: DateTime!, $to: DateTime!) { user(login: $login) {
      contributionsCollection(from: $from, to: $to) { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`,
    { login: USER, from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z` },
  );
  for (const week of data.user.contributionsCollection.contributionCalendar.weeks)
    for (const d of week.contributionDays) days.push({ date: d.date, count: d.contributionCount });
}
const today = now.toISOString().slice(0, 10);
const calendar = days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));

// Streaks: today without a contribution yet doesn't break the current one.
let longest = { length: 0 };
let run = null;
for (const d of calendar) {
  if (d.count > 0) run = run ? { ...run, end: d.date, length: run.length + 1 } : { start: d.date, end: d.date, length: 1 };
  else run = null;
  if (run && run.length > longest.length) longest = run;
}
const last = calendar.at(-1);
const current = run ?? (last?.count === 0 && calendar.at(-2)?.count > 0 ? findRunEndingAt(calendar.length - 2) : { length: 0 });
function findRunEndingAt(i) {
  let j = i;
  while (j > 0 && calendar[j - 1].count > 0) j--;
  return { start: calendar[j].date, end: calendar[i].date, length: i - j + 1 };
}

const first = calendar.find((d) => d.count > 0)?.date ?? calendar[0]?.date;
const svg = await (await fetch(`https://komarev.com/ghpvc/?username=${USER}`)).text();
const views = Number([...svg.matchAll(/>\s*([\d,]+)\s*</g)].at(-1)?.[1].replace(/,/g, "") ?? 0);

const stats = {
  total: calendar.reduce((sum, d) => sum + d.count, 0),
  since: first,
  current,
  longest,
  views,
  lastYear: calendar.slice(-52 * 7 - new Date(today).getUTCDay() - 1).map((d) => d.count),
  lastDay: today,
};
writeFileSync(resolve(import.meta.dirname, "src/stats.json"), `${JSON.stringify(stats)}\n`);
console.log({ ...stats, lastYear: `${stats.lastYear.length} days` });
