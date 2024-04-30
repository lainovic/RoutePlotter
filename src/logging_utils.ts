const Logger = {
  debug: true,

  log(message: string, ...rest: any[]) {
    if (this.debug) console.log(message, rest);
  },

  error(message: string, ...rest: any[]) {
    if (this.debug) console.error(message, rest);
  },
};

export default Logger;
export const log = Logger.log.bind(Logger);
export const error = Logger.error.bind(Logger);
