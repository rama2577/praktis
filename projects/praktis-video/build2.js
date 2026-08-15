const { execSync } = require("child_process");
const fs = require("fs");

const ROOT = "/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-video";
const CLIPS = ROOT + "/clips";
const VO = ROOT + "/assets/vo-edge";
const SLIDES = ROOT + "/assets";
const BUILD = ROOT + "/build2";
fs.mkdirSync(BUILD, { recursive: true });

function dur(file) {
  return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`).toString().trim());
}
function sh(cmd) { execSync(cmd, { stdio: "inherit" }); }
function webm(dir) { return fs.readdirSync(dir).find(f => f.endsWith(".webm")); }

const dashFile = `${CLIPS}/dash/${webm(CLIPS + "/dash")}`;
const pipeFile = `${CLIPS}/pipeline/${webm(CLIPS + "/pipeline")}`;
const revFile = `${CLIPS}/review/${webm(CLIPS + "/review")}`;
const custFile = `${CLIPS}/custom/${webm(CLIPS + "/custom")}`;

const seg = {};
for (const s of ["seg1", "seg2", "seg3", "seg4", "seg5", "seg6"]) seg[s] = dur(`${VO}/${s}.mp3`);
console.log("vo:", seg);

// cap each scene to VO + short buffer (0.4s), so total ~1:20
const r = n => Math.round(n * 10) / 10;
const introDur = r(seg.seg1 + 0.5);
const dashCap = r(seg.seg2 + 0.5);
const pipeCap = r(seg.seg3 + 0.5);
const revCap = r(seg.seg4 + 0.5);
const custCap = r(seg.seg5 + 0.5);
const outroDur = r(seg.seg6 + 0.7);
console.log("caps:", { introDur, dashCap, pipeCap, revCap, custCap, outroDur });

function encodeClip(inFile, outFile, cap, fadeIn, fadeOut) {
  const fo = `fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${Math.max(0, cap - fadeOut)}:d=${fadeOut}`;
  sh(`ffmpeg -y -v error -i "${inFile}" -t ${cap} -vf "scale=1920:1080:flags=lanczos,format=yuv420p,fps=30,${fo}" -c:v libx264 -preset medium -crf 20 -an "${outFile}"`);
}
function encodeSlide(png, outFile, d, fadeIn, fadeOut) {
  const fo = `fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${Math.max(0, d - fadeOut)}:d=${fadeOut}`;
  sh(`ffmpeg -y -v error -loop 1 -i "${png}" -t ${d} -vf "scale=1920:1080,format=yuv420p,fps=30,${fo}" -c:v libx264 -preset medium -crf 20 -an "${outFile}"`);
}

encodeSlide(`${SLIDES}/intro.png`, `${BUILD}/intro.mp4`, introDur, 0.5, 0.6);
encodeClip(dashFile, `${BUILD}/dash.mp4`, dashCap, 0.4, 0.5);
encodeClip(pipeFile, `${BUILD}/pipe.mp4`, pipeCap, 0.4, 0.5);
encodeClip(revFile, `${BUILD}/rev.mp4`, revCap, 0.4, 0.5);
encodeClip(custFile, `${BUILD}/cust.mp4`, custCap, 0.4, 0.5);
encodeSlide(`${SLIDES}/outro.png`, `${BUILD}/outro.mp4`, outroDur, 0.5, 1.0);

const list = `${BUILD}/list.txt`;
fs.writeFileSync(list, [
  `file '${BUILD}/intro.mp4'`,
  `file '${BUILD}/dash.mp4'`,
  `file '${BUILD}/pipe.mp4'`,
  `file '${BUILD}/rev.mp4'`,
  `file '${BUILD}/cust.mp4'`,
  `file '${BUILD}/outro.mp4'`,
].join("\n") + "\n");
sh(`ffmpeg -y -v error -f concat -safe 0 -i "${list}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an "${BUILD}/full.mp4"`);
const total = dur(`${BUILD}/full.mp4`);
console.log("total", total);

for (const s of ["seg1", "seg2", "seg3", "seg4", "seg5", "seg6"]) {
  sh(`ffmpeg -y -v error -i "${VO}/${s}.mp3" -ar 44100 -ac 1 "${BUILD}/${s}.wav"`);
}

const S1 = 0;
const S2 = introDur;
const S3 = S2 + dashCap;
const S4 = S3 + pipeCap;
const S5 = S4 + revCap;
const S6 = S5 + custCap;
const off = [
  Math.round((S1 + 0.4) * 1000),
  Math.round((S2 + 0.5) * 1000),
  Math.round((S3 + 0.4) * 1000),
  Math.round((S4 + 0.4) * 1000),
  Math.round((S5 + 0.4) * 1000),
  Math.round((S6 + 0.2) * 1000),
];
console.log("offsets(ms)", off);
const fc = [
  `[0:a]adelay=${off[0]}[n1]`,
  `[1:a]adelay=${off[1]}[n2]`,
  `[2:a]adelay=${off[2]}[n3]`,
  `[3:a]adelay=${off[3]}[n4]`,
  `[4:a]adelay=${off[4]}[n5]`,
  `[5:a]adelay=${off[5]}[n6]`,
  `[n1][n2][n3][n4][n5][n6]amix=inputs=6:normalize=0`,
].join(";");
sh(`ffmpeg -y -v error -i "${BUILD}/seg1.wav" -i "${BUILD}/seg2.wav" -i "${BUILD}/seg3.wav" -i "${BUILD}/seg4.wav" -i "${BUILD}/seg5.wav" -i "${BUILD}/seg6.wav" -filter_complex "${fc}" -ar 44100 "${BUILD}/narration.wav"`);

const mdur = Math.ceil(total) + 2;
sh(`ffmpeg -y -v error -f lavfi -i "sine=frequency=110:duration=${mdur}" -f lavfi -i "sine=frequency=164.81:duration=${mdur}" -f lavfi -i "sine=frequency=220:duration=${mdur}" -f lavfi -i "sine=frequency=261.63:duration=${mdur}" -filter_complex "[0:a]volume=0.14[a0];[1:a]volume=0.11[a1];[2:a]volume=0.09[a2];[3:a]volume=0.07[a3];[a0][a1][a2][a3]amix=inputs=4:normalize=0,tremolo=f=0.12:d=0.5,lowpass=f=1400,afade=t=in:st=0:d=4,afade=t=out:st=${total - 6}:d=6" -ar 44100 -ac 1 "${BUILD}/music.wav"`);

sh(`ffmpeg -y -v error -i "${BUILD}/narration.wav" -i "${BUILD}/music.wav" -filter_complex "[0:a]volume=1.0[n];[1:a]volume=0.16[m];[n][m]amix=inputs=2:normalize=0,alimiter=limit=0.95" -ar 44100 "${BUILD}/audio-mix.wav"`);

sh(`ffmpeg -y -v error -i "${BUILD}/full.mp4" -i "${BUILD}/audio-mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${ROOT}/video-praktis-v2.mp4"`);

console.log("FINAL", dur(`${ROOT}/video-praktis-v2.mp4`), "s");
