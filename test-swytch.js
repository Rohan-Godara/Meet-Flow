import { exec } from "@swytchcode/runtime";
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config();

console.log("Testing Swytchcode execution...");

async function test() {
  try {
    console.log("Calling exec via @swytchcode/runtime...");
    const res = await exec("calendar.event.create", {
      calendarId: "primary",
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      summary: "Test Meeting"
    });
    console.log("Result:", res);
  } catch (err) {
    console.error("Runtime exec error:", err.message);
  }
}

test();
