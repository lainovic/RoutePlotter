export function log(message: string, ...rest: any[]) {
    const debug = true;
    if (debug) console.log(message, rest);
  }
  