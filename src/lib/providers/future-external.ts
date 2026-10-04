import type { MediaProvider } from "./types";

export class FutureExternalProvider implements MediaProvider {
  name = "EXTERNAL";

  async resolve() {
    // Deliberately empty: external providers can be added without changing playback.
    return [];
  }
}
