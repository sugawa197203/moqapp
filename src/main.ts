import { Player } from "@openmoq/playa";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("connect-form");
const urlInput = $<HTMLInputElement>("relay-url");
const namespaceInput = $<HTMLInputElement>("namespace");
const qualitySelect = $<HTMLSelectElement>("quality");
const disconnectBtn = $<HTMLButtonElement>("disconnect");
const statusEl = $("status");
const container = $("player-container");

let player: Player | undefined;

async function disconnect() {
  await player?.destroy();
  player = undefined;
  container.replaceChildren();
  qualitySelect.replaceChildren();
  qualitySelect.disabled = true;
  disconnectBtn.disabled = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await disconnect();
  statusEl.textContent = "connecting...";
  const p = new Player(container, {
    url: urlInput.value,
    namespace: namespaceInput.value,
    draftVersion: 22,
    muted: true,
  });
  player = p;
  p.on("ready", ({ levels }) => {
    qualitySelect.replaceChildren(
      new Option("Auto", "auto"),
      ...levels.map((l) => new Option(`${l.index}: ${l.label} (${Math.round(l.bitrate / 1000)} kbps)`, String(l.index))),
    );
    qualitySelect.disabled = false;
  });
  p.on("qualitychange", ({ level, auto }) => {
    statusEl.textContent = `playing: ${level.label} ${auto ? "(auto)" : "(constant)"}`;
  });
  p.on("error", ({ severity, code, message }) => {
    statusEl.textContent = `error [${severity}/${code}] ${message}`;
  });
  disconnectBtn.disabled = false;
  try {
    await p.load();
    p.play();
  } catch (err) {
    statusEl.textContent = `Connection failed: ${(err as Error).message}`;
  }
});

qualitySelect.addEventListener("change", () => {
  const v = qualitySelect.value;
  void player?.setQuality(v === "auto" ? "auto" : Number(v));
});

disconnectBtn.addEventListener("click", async () => {
  await disconnect();
  statusEl.textContent = "disconnected";
});
