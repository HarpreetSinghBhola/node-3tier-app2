// Middleware
import { server } from "./server.ts";

server.run();

console.log("Drash server running on realworld_drash:1667");
console.log(
  "Navigate to localhost:8080 for a proxy pass, or localhost:1667 to be direct",
);
