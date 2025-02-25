#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import progress from "progress-stream";
import fs from "node:fs";
import cliProgress from "cli-progress";
import { exiftool } from "exiftool-vendored";
import inquirer from "inquirer";
import { promisify } from "util";
import { pipeline } from "stream";

const program = new Command();
const pipelineAsync = promisify(pipeline);

async function removeMetadata(input: string, output: string, overwrite: boolean) {
  return new Promise<void>(async (resolve, reject) => {
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

    const readStream = fs.createReadStream(input).pipe(str);
    const writeStream = fs.createWriteStream(output);

    readStream.on('end', async () => {
      try {
        const exiftoolArgs = overwrite ? ['-all=', '-overwrite_original'] : ['-all='];
        await exiftool.write(output, {}, exiftoolArgs);
        bar.update(stat.size);
        bar.stop();
        console.log(
          `Metadata removed successfully. Output saved to ${path.basename(output)}`,
        );
        resolve();
        process.exit(0);
      } catch (err) {
        bar.stop();
        if (err instanceof Error) {
          console.error(`Error processing file: ${err.message}`);
        } else {
          console.error('Error processing file');
        }
        reject(err);
      }
    });

    readStream.pipe(writeStream);
  });
}

async function promptOverwrite(input: string) {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'overwrite',
      message: 'Do you want to overwrite the original file?',
      default: false,
    },
  ]);

  if (answers.overwrite) {
    await removeMetadata(input, input, true);
  } else {
    const output = `${path.basename(input, path.extname(input))}_copy${path.extname(input)}`;
    await pipelineAsync(fs.createReadStream(input), fs.createWriteStream(output));
    await removeMetadata(output, output, true);
  }
}

process.on('SIGINT', () => {
  console.log('Process interrupted.');
  process.exit();
});

program
  .name("csc")
  .description("CLI to remove metadata from MP4 files")
  .version("1.0.0")
  .argument("<input_video>", "Input video file")
  .action((inputVideo: string) => {
    promptOverwrite(inputVideo).catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
  });

program.parse(process.argv);
