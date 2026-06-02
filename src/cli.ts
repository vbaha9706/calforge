#!/usr/bin/env node
/**
 * calforge CLI — make .ics files & "Add to Calendar" links. Zero-dependency.
 *
 *   calforge --title "Standup" --start 2026-07-01T09:00 --duration 30 > standup.ics
 *   calforge -t "Conf" --start 2026-09-10 --all-day --location Berlin --links
 *   calforge --title "Launch" --start 2026-07-01T17:00 -o launch.ics
 */

import { writeFileSync } from "node:fs";
import { links, toICS, type EventInput } from "./index.js";
import pkg from "../package.json";

const HELP = `calforge — generate .ics calendar files and Add-to-Calendar links.

Usage:
  calforge --title <t> --start <when> [options]

Required:
  -t, --title <text>      Event title
      --start <when>      ISO datetime, or YYYY-MM-DD for all-day

Options:
      --end <when>        End time (else uses --duration)
      --duration <min>    Length in minutes (default 60)
      --all-day           All-day event
      --location <text>
      --description <text>
      --url <url>
      --rrule <rule>      Recurrence, e.g. "FREQ=WEEKLY;BYDAY=MO"
      --alarm <min>       Reminder minutes before start
      --links             Print Google/Yahoo/Apple/.ics links instead of the .ics
  -o, --out <file>        Write the .ics to a file (else stdout)
  -h, --help              Show this help
  -v, --version           Show version

For reproducible output, set SOURCE_DATE_EPOCH or pass through the library API.
Everything is generated locally — no third-party calendar service involved.`;

function val(argv: string[], ...names: string[]): string | undefined {
  for (const n of names) {
    const i = argv.indexOf(n);
    if (i !== -1) return argv[i + 1];
  }
  return undefined;
}
function has(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function main(): number {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || has(argv, "-h") || has(argv, "--help")) {
    process.stdout.write(HELP + "\n");
    return argv.length === 0 ? 2 : 0;
  }
  if (has(argv, "-v") || has(argv, "--version")) {
    process.stdout.write(`calforge ${pkg.version}\n`);
    return 0;
  }

  const title = val(argv, "-t", "--title");
  const start = val(argv, "--start");
  if (!title || !start) {
    process.stderr.write("calforge: --title and --start are required. See --help.\n");
    return 2;
  }

  const event: EventInput = { title, start };
  const end = val(argv, "--end");
  if (end) event.end = end;
  const dur = val(argv, "--duration");
  if (dur) event.durationMinutes = Number(dur);
  if (has(argv, "--all-day")) event.allDay = true;
  const loc = val(argv, "--location");
  if (loc) event.location = loc;
  const desc = val(argv, "--description");
  if (desc) event.description = desc;
  const url = val(argv, "--url");
  if (url) event.url = url;
  const rrule = val(argv, "--rrule");
  if (rrule) event.rrule = rrule;
  const alarm = val(argv, "--alarm");
  if (alarm) event.alarmMinutes = Number(alarm);

  try {
    if (has(argv, "--links")) {
      const l = links(event);
      process.stdout.write(
        `Google:    ${l.google}\n` +
          `Outlook:   ${l.outlook}\n` +
          `Office365: ${l.office365}\n` +
          `Yahoo:     ${l.yahoo}\n`,
      );
      return 0;
    }
    const ics = toICS(event);
    const out = val(argv, "-o", "--out");
    if (out) {
      writeFileSync(out, ics);
      process.stderr.write(`✓ wrote ${out}\n`);
    } else {
      process.stdout.write(ics + "\n");
    }
    return 0;
  } catch (e) {
    process.stderr.write(`calforge: ${(e as Error).message}\n`);
    return 1;
  }
}

process.exit(main());
