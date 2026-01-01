import app from "../src/worker/index";
import { handle } from "hono/cloudflare-pages";

export const onRequest = handle(app);


