import { TinyFish } from "@tiny-fish/sdk";

const tinyfish = new TinyFish({
  apiKey: process.env.TINYFISH_API_KEY,
});

export default tinyfish;
