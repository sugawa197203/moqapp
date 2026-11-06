import { Player } from "@openmoq/playa";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("connect-form");
const urlInput = $<HTMLInputElement>("relay-url");
const namespaceInput = $<HTMLInputElement>("namespace");
const qualitySelect = $<HTMLSelectElement>("quality");
const disconnectBtn = $<HTMLButtonElement>("disconnect");
const statusEl = $("status");
const statsEl = $("stats");
const decoding = new URLSearchParams(location.search).get("decoding") === "mse" ? "mse" : "frame";
const container = $("player-container");
const canvasEl = $<HTMLCanvasElement>("canvas");
const videoEl = $<HTMLVideoElement>("video");
canvasEl.hidden = decoding === "mse";
videoEl.hidden = decoding !== "mse";
const fullscreenBtn = $<HTMLButtonElement>("fullscreen");

let player: Player | undefined;
let generation = 0;

async function disconnect() {
  const p = player;
  player = undefined;
  qualitySelect.replaceChildren();
  qualitySelect.disabled = true;
  statsEl.textContent = "";
  disconnectBtn.disabled = true;
  await p?.destroy();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = ++generation;
  await disconnect();
  if (id !== generation) return;
  statusEl.textContent = "connecting...";
  const p = new Player(null, {
    canvas: canvasEl,
    video: videoEl,
    url: urlInput.value,
    namespace: namespaceInput.value,
    draftVersion: 18,
    muted: true,
    moqtPlayerConfig: { locmafDecoding: decoding },
  });
  player = p;
  const current = () => player === p;
  p.on("ready", ({ levels }) => {
    if (!current()) return;
    qualitySelect.replaceChildren(
      new Option("Auto", "auto"),
      ...levels.map((l) => new Option(`${l.index}: ${l.label} (${Math.round(l.bitrate / 1000)} kbps)`, String(l.index))),
    );
    qualitySelect.disabled = levels.length === 0;
  });
  p.on("statechange", ({ state }) => {
    if (current()) statusEl.textContent = state;
  });
  p.on("qualitychange", ({ level, auto }) => {
    if (current()) statusEl.textContent = `playing: ${level.label} ${auto ? "(auto)" : "(fixed)"}`;
  });
  p.on("stats", (s) => {
    if (!current()) return;
    if (s.resolution && (canvasEl.width !== s.resolution.width || canvasEl.height !== s.resolution.height)) {
      canvasEl.width = s.resolution.width;
      canvasEl.height = s.resolution.height;
    }
    const res = s.resolution ? `${s.resolution.width}x${s.resolution.height}` : "-";
    statsEl.textContent = `${decoding} ${res} ${Math.round(s.bitrate / 1000)}kbps decoded=${s.framesDecoded} dropped=${s.framesDropped} stalls=${s.stallCount} ttff=${s.timeToFirstFrameMs ?? "-"}ms`;
  });
  p.on("error", ({ severity, code, message }) => {
    if (current()) statusEl.textContent = `error [${severity}/${code}] ${message}`;
  });
  disconnectBtn.disabled = false;
  try {
    await p.load();
    if (current()) p.play();
  } catch (err) {
    if (!current()) return;
    await disconnect();
    statusEl.textContent = `Connection failed: ${(err as Error).message}`;
  }
});

qualitySelect.addEventListener("change", () => {
  const v = qualitySelect.value;
  player?.setQuality(v === "auto" ? "auto" : Number(v)).catch((err: Error) => {
    statusEl.textContent = `setQuality failed: ${err.message}`;
  });
});

disconnectBtn.addEventListener("click", async () => {
  generation++;
  await disconnect();
  statusEl.textContent = "disconnected";
});

const toggleFullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void container.requestFullscreen();
};
fullscreenBtn.addEventListener("click", toggleFullscreen);
container.addEventListener("dblclick", toggleFullscreen);
