import { createServerFn } from "@tanstack/react-start";
import { poeKeys, toHex } from "./poe.server";

export const getPoePublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { publicKey } = poeKeys();
  return { publicKey: toHex(publicKey), algo: "ed25519" as const };
});
