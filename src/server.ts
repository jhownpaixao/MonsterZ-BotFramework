import ApplicationEngine from "@app/facade/ApplicationEngine";
import "dotenv/config";
const engine = new ApplicationEngine(process.env.token);
engine.start();
