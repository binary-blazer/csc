#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import ffmpeg from "fluent-ffmpeg";
import progress from "progress-stream";
import fs from "node:fs";
import cliProgress from "cli-progress";

const program = new Command();

async function removeMetadata(input: string, output: string) {
  return new Promise<void>((resolve, reject) => {
    const stat = fs.statSync(input);
    const str = progress({
      length: stat.size,
      time: 100 /* ms */
    });

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(stat.size, 0);

    str.on('progress', (progress) => {
      bar.update(progress.transferred);
    });

    ffmpeg(input)
      .input(str)
      .outputOptions("-map_metadata", "-1")
      .save(output)
      .on("end", () => {
        bar.update(stat.size);
        bar.stop();
        console.log(
          `Metadata removed successfully. Output saved to ${path.basename(output)}`,
        );
        resolve();
      })
      .on("error", (err: Error) => {
        bar.stop();
        console.error(`Error processing file: ${err.message}`);
        reject(err);
      });

    fs.createReadStream(input).pipe(str);
  });
}

program
  .name("csc")
  .description("CLI to remove metadata from MP4 files")
  .version("1.0.0")
  .argument("<input_video>", "Input video file")
  .argument("<output_video>", "Output video file")
  .action((inputVideo: string, outputVideo: string) => {
    removeMetadata(inputVideo, outputVideo).catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
  });

program.parse(process.argv);
