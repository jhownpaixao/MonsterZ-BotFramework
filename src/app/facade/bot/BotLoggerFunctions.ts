import { Logger } from "pino-multi-stream";
import logger from "../logger";
import { Console, level } from "../console";
abstract class BotLoggerFunctions {
  logger: Logger;
  name: string;

  report = (content: string, level: level) => {
    Console.log(`[🤖][${this.name}]:: ${content}`, level);
  };
}
export default BotLoggerFunctions;
