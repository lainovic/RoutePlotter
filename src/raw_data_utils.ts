import { log } from "./logging_utils";
import { Maybe, Message, NavigationPoint, ParseResult } from "./types";

export type ParsedRawPoints = {
  points: NavigationPoint[];
  message: Message;
};

export type MaybeRawPoints = ParseResult<ParsedRawPoints>;

/**
 * Parses the provided text and attempts to extract any points from it.
 *
 * @param text - The text to parse for points.
 * @returns A `Maybe` containing either the extracted points and a success message, or a failure message if no points were found.
 */
export function parseRawPoints(text: string): MaybeRawPoints {
  const result = findMatches(text);
  if (result.points.length > 0) {
    return Maybe.success({
      result,
      message: { value: "Points extracted successfully." },
    });
  } else {
    return Maybe.failure(result.message);
  }
}

/**
 * A class that provides methods for finding matches in a given text using a set of regular expressions.
 */
class Matcher {
  regexes: RegExp[] = [];

  findMatches(text: string): NavigationPoint[] {
    const result: NavigationPoint[] = [];
    let match: RegExpExecArray | null;
    for (let regex of this.regexes) {
      while ((match = regex.exec(text))) {
        log("Match:", match);
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        if (latitude && longitude) {
          result.push({
            timestamp: null,
            latitude: latitude,
            longitude: longitude,
            speed: null,
          });
        }
      }
      if (result.length > 0) {
        break;
      }
    }
    return result;
  }
}

/**
 * The `RawPointMatcher` class is a subclass of the `Matcher` class and is used to match GeoPoint expressions in text.
 * It defines two regular expressions that can match GeoPoint expressions in the format `GeoPoint(latitude = <value>, longitude = <value>)` and `GeoPoint(<value>, <value>)`.
 */
class RawPointMatcher extends Matcher {
  constructor() {
    super();
    this.regexes = [
      /GeoPoint\(latitude\s?=\s?([\d.-]+)[,\s]+longitude\s?=\s?([\d.-]+)\)/g,
      /GeoPoint\(([\d.-]+)[,\s]+([\d.-]+)\)/g,
    ];
  }
}

/**
 * The `JsonMatcher` class extends the `Matcher` class and is used to match JSON-formatted, and JSON-like, latitude and longitude coordinates.
 * It defines two regular expressions to match coordinates in the format `"lat": 37.7749, "lon": -122.4194` and "latitude": 37.7749, "longitude": -122.4194`, with or without quotes and whitespace characters.
 */
class JsonMatcher extends Matcher {
  constructor() {
    super();
    this.regexes = [
      /"?(?:lat|latitude)"?\s*[:\s]+\s*([\d.-]+)[,\s]+"?(?:lon|longitude)"?\s*[:\s]+\s*([\d.-]+)/g,
      /([\d.-]+)[,\s]+([\d.-]+)/g,
    ];
  }
}

/**
 * Finds and extracts points from the given text.
 * The JSON matcher is used first, followed by the raw point matcher.
 *
 * @param text - The text to search for points.
 * @returns An object containing the extracted points and a message indicating the type of points found.
 */
function findMatches(text: string): ParsedPoints {
  const jsonMatcher = new JsonMatcher();
  const jsonPoints = jsonMatcher.findMatches(text);
  if (jsonPoints.length > 0) {
    return {
      points: jsonPoints,
      message: { value: "JSON points extracted:" },
    };
  }
  const rawPointMatcher = new RawPointMatcher();
  const rawPoints = rawPointMatcher.findMatches(text);
  if (rawPoints.length > 0) {
    return {
      points: rawPoints,
      message: { value: "Raw points extracted:" },
    };
  }
  return {
    points: [],
    message: { value: "No valid raw points found." },
  };
}
