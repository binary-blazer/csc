#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error: No types available
import MP4Box from 'mp4box';
import { Command } from 'commander';

const program = new Command();

async function removeMetadata(input: string, output: string) {
    const inputFile = fs.readFileSync(input);
    const buffer = inputFile.buffer.slice(inputFile.byteOffset, inputFile.byteOffset + inputFile.byteLength);
    const mp4boxfile = MP4Box.createFile();

    mp4boxfile.onError = (e: Error) => {
        throw new Error(`Error reading MP4: ${e.message}`);
    };

    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set(new Uint8Array(buffer));

    mp4boxfile.appendBuffer(arrayBuffer);
    mp4boxfile.flush();

    const cleanBoxes = mp4boxfile.boxes.filter((box: any) => !['udta', 'meta'].includes(box.type));
    mp4boxfile.boxes = cleanBoxes;

    const outputArrayBuffer = mp4boxfile.write();
    fs.writeFileSync(output, Buffer.from(outputArrayBuffer));

    console.log(`Metadata removed successfully. Output saved to ${path.basename(output)}`);
}

program
    .name('csc')
    .description('CLI to remove metadata from MP4 files')
    .version('1.0.0')
    .argument('<input_video>', 'Input video file')
    .argument('<output_video>', 'Output video file')
    .action((inputVideo: string, outputVideo: string) => {
        removeMetadata(inputVideo, outputVideo).catch(err => {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        });
    });

program.parse(process.argv);