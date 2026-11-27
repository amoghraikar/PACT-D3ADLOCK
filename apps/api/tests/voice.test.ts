import { describe, expect, it } from "vitest";
import { normaliseTranscript, parseVoiceSegments } from "../src/modules/voice.engine.js";

describe("Multilingual Voice Normaliser & Parser", () => {
  it("normalises Hinglish fillers, fractions, numbers, and Devanagari digits cleanly", () => {
    expect(normaliseTranscript("please add do kilo chawal aur aadha kilo cheeni")).toBe(
      "2 kilo chawal aur 0.5 kilo cheeni"
    );
    expect(normaliseTranscript("२ लीटर दूध और डेढ़ किलो चीनी")).toBe("2 लीटर दूध और 1.5 किलो चीनी");
  });

  it("parses both standard (<qty> <unit> <product>) and colloquial Hindi (<product> <qty> <unit>) order segments", () => {
    const segs = parseVoiceSegments("do kilo chawal aur amul doodh ek litre");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ quantity: 2, unit: "kg", productPhrase: "chawal" });
    expect(segs[1]).toMatchObject({ quantity: 1, unit: "litre", productPhrase: "amul doodh" });
  });
});
