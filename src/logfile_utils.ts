import { Maybe, ParseResult, Message } from "./types";

export interface LogcatEntry {
  timestamp: Date;
  pid: string;
  tid: string;
  level: Level;
  tag: string;
  message: string;
}

enum Level {
  Verbose = "V",
  Debug = "D",
  Info = "I",
  Warn = "W",
  Error = "E",
  Assert = "A",
}

function toLevel(level: string): Level {
  switch (level) {
    case "V":
      return Level.Verbose;
    case "D":
      return Level.Debug;
    case "I":
      return Level.Info;
    case "W":
      return Level.Warn;
    case "E":
      return Level.Error;
    case "A":
      return Level.Assert;
    default:
      return Level.Info;
  }
}

function toDate(timestamp: string) {
  const [date, time] = timestamp.split(" ");
  const [year, month, day] = date.split("-");
  const [hour, minute, second] = time.split(":");
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

export interface ParsedLogfile {
  log: LogcatEntry[];
  message: Message;
}

export type MaybeLogFile = ParseResult<ParsedLogfile>;

/**
 * Parses the content of a logfile and returns a `MaybeLogFile` object containing the parsed log entries.
 *
 * @param content - The content of the logfile as a string.
 * @returns A `MaybeLogFile` object containing the parsed log entries, or a failure message if no log entries were found.
 */
export function parseLogfile(content: string): MaybeLogFile {
  const lines = content.split("\n");
  const logcatEntryPattern =
    /(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([A-Z])\s+([^\s]+)\s*:\s*(.*)/;
  const log = lines
    .map((line) => {
      const match = line.match(logcatEntryPattern);
      if (match) {
        return {
          timestamp: toDate(match[1]),
          pid: match[2],
          tid: match[3],
          level: toLevel(match[4]),
          tag: match[5],
          message: match[6],
        };
      }
      return null;
    })
    .filter(Boolean) as LogcatEntry[];

  if (log.length === 0) {
    return Maybe.failure({ value: "No valid log entries found." });
  } else
    return Maybe.success({
      result: {
        log,
        message: { value: "Parsed logcat" },
      },
      message: { value: "Log extracted successfully." },
    });
}
