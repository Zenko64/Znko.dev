import ffmpeg from "@ts-ffmpeg/fluent-ffmpeg";
import { Readable } from "stream";
import { mkdir, stat } from "fs/promises";
import path from "path";
import { Stats } from "fs";

interface Encoder {
  label: string;
  description?: string;
  hardware?: boolean;
  options: string[];
}

const baseOptions = [
  "-movflags",
  "+faststart",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-threads",
  "0",
  "-maxrate",
  "8M",
  "-bufsize",
  "16M",
  "-g",
  "120",
  "-hls_time",
  "6",
  "-hls_playlist_type",
  "vod",
  "-hls_segment_type",
  "fmp4",
];

// Should be ordered by preference (most preferred first)
const encoders: Record<string, Encoder> = {
  av1_nvenc: {
    label: "NVIDIA NVENC AV1",
    description:
      "NVIDIA's Hardware Accelerated Encoder. Supported by Ampere GPUs (RTX 30 series) and newer.",
    hardware: true,
    options: [
      ...baseOptions,
      "-c:v",
      "av1_nvenc",
      "-preset",
      "p3",
      "-rc",
      "vbr",
      "-cq",
      "30",
      "-b:v",
      "0",
    ],
  },
  av1_amf: {
    label: "AMD AMF AV1",
    description:
      "AMD's Hardware Accelerated Encoder. Supported by RDNA 2 GPUs (RX 6000 series) and newer.",
    hardware: true,
    options: [
      ...baseOptions,
      "-c:v",
      "av1_amf",
      "-quality",
      "balanced",
      "-rc",
      "vbr_latency",
      "-qvbr_quality_level",
      "28",
    ],
  },
  av1_qsv: {
    label: "Intel QSV AV1",
    description:
      "Intel's Hardware Accelerated Encoder. Supported by 11th Gen Core (Tiger Lake) and newer.",
    hardware: true,
    options: [
      ...baseOptions,
      "-c:v",
      "av1_qsv",
      "-preset",
      "medium",
      "-global_quality",
      "28",
      "-look_ahead",
      "1",
    ],
  },
  libsvtav1: {
    label: "SVT-AV1 (CPU)",
    description:
      "Intel's Software AV1 Encoder. Provides high-quality encoding using CPU resources.",
    hardware: false,
    options: [
      ...baseOptions,
      "-c:v",
      "libsvtav1",
      "-preset",
      "6",
      "-crf",
      "28",
      "-svtav1-params",
      "tune=0:film-grain=8",
    ],
  },
};

function getCompiledEncoderKeys(): Promise<string[]> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableEncoders((err, available) => {
      if (err) return resolve([]);
      resolve(Object.keys(encoders).filter((k) => k in available));
    });
  });
}

/**
 * Test probe the given encoder.
 * Why: I ran the software on my server, and while it returns NVENC, the GPU does NOT support av1, causing a failure.
 * @param encoder
 * @returns Boolean check
 */
async function probeEncoder(encoder: Encoder): Promise<boolean> {
  const cvIndex = encoder.options.indexOf("-c:v"); // find codec option index
  const codecOptions =
    cvIndex !== -1 ? ["-c:v", encoder.options[cvIndex + 1]] : []; // gets the value from cv (actual codec)

  return new Promise((resolve) => {
    ffmpeg()
      .input("color=black:s=16x16:r=1")
      .inputFormat("lavfi")
      .setDuration(0.1)
      .addOutputOptions(...codecOptions, "-f", "null")
      .output("-")
      .on("end", () => resolve(true))
      .on("error", () => resolve(false))
      .run();
  });
}

// Find the superior encoder
async function detectBestEncoder(): Promise<Encoder> {
  const keys = await getCompiledEncoderKeys();
  for (const key of keys) {
    if (await probeEncoder(encoders[key])) return encoders[key];
  }
  return encoders.libsvtav1;
}

const bestEncoder = await detectBestEncoder();
async function transcode(
  input: string | Readable,
  outputDir: string,
  onProgress: (percent: number) => void,
  onStart: () => void,
  onEnd: (indexFile: string) => void,
): Promise<void> {
  if (
    await stat(outputDir)
      .then((stats: Stats) => !stats.isDirectory())
      .catch(() => false)
  ) {
    throw new Error(`Output directory already exists: ${outputDir}`);
  }

  const segmentsDir = path.join(outputDir, "segments");
  await mkdir(segmentsDir, { recursive: true });

  const options = [
    ...bestEncoder.options,
    "-hls_segment_filename",
    "segments/seg_%03d.m4s",
    "-hls_fmp4_init_filename",
    "init.mp4",
    "-hls_base_url",
    "segments/",
  ];

  const indexFileOut = path.join(outputDir, "index.m3u8");

  return new Promise<void>((resolve, reject) => {
    ffmpeg({ cwd: outputDir })
      .input(input)
      .addOutputOptions(options)
      .output(indexFileOut)
      .on("error", (err) => {
        reject(err);
      })
      .on("end", () => {
        onEnd(indexFileOut);
        resolve();
      })
      .on("start", () => {
        onStart();
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          onProgress(progress.percent);
        }
      })
      .run();
  });
}

export default transcode;
