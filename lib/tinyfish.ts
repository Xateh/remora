import { TinyFish } from "@tiny-fish/sdk";

const tinyfish = new TinyFish({
  apiKey: process.env.TINYFISH_API_KEY,
  timeout: 600_000, // 5 minutes
});

export default tinyfish;
