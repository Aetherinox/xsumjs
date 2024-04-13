/*
    MIT License

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

import { createReadStream, promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';
import debug from 'debug';
const log = debug('xsumjs');
const pipeline = promisify(stream.pipeline);

/*
    (string): hexadecimal checksum
    (bool): whether entry is for a binary file.
*/

export type Checksum = [string, boolean];

/*
    Options used when validating a checksum.
    default encoding is 'utf8
*/

export type CSParams = {
    encoding?: BufferEncoding;
};

class ThrowError extends Error {
    file: string;

    constructor(file: string) {
        super();
        this.file = file;
    }
}

/*
    Validate checksum of files with a specified checksum digest.
    Digest file can be created using xSum, cyberchef, or sha256sum.

    Throws an error if file fails checksum validation.

    @param  algo            : hash algorithm used in `digest`.
                              Algorithm is dependent on the available algorithms supported by the version of OpenSSL on the platform

    @param  digest          : Path to the checksum digest file.
    @param  dirBase         : Base directory for the files specified in `files`.
    @param  files           : One or more paths of the files that will be validated.
                              Relative to `dirBase`.

*/

export default async function xsumjs(
    algo: string,
    digest: string,
    dirBase: string,
    files: string[] | string
): Promise<void> {
    return new CSVerify(algo, digest).validate(dirBase, files);
}

/*
    Throw error if any file does not match specified checksum
    @param file     : A path to a file that did not match.

    For running tests; this.message below must match with tests/index.ts
    for test "Specified file checksum mismatch"
*/

export class CSErrorMismatch extends ThrowError {
    constructor(file: string) {
        super(file);
        this.message = `"${file}" does not have matching checksum`;
    }
}

/*
    Throw error if checksum digest file cannot be parsed or doesnt match checksum file format
    @param lineNum      : The line number that could not be parsed.
    @param line         : The raw line data that could not be parsed, sans newline.

    For running tests; this.message below must match with tests/index.ts
    for test "Checksum file parse unsuccessful"
*/

export class CSErrorParse extends Error {
    lineNum: number; // line that cannot be parsed
    line: string; // raw line that cannot be parsed

    constructor(lineNum: number, line: string) {
        super();
        this.lineNum = lineNum;
        this.line = line;
        this.message = `Could not parse checksum file at line #${lineNum}: ${line}`;
    }
}

/*
    Throw error if at least one specified file is not listed in digest
    @param file         : Specified file(s)

    For running tests; this.message below must match with tests/index.ts
    for test "Specified file not found in digest"
*/

export class CSErrorNoMatch extends ThrowError {
    constructor(file: string) {
        super(file);
        this.message = `No checksum found in digest for file: "${file}".`;
    }
}

export class CSVerify {
    algo: string;
    digest: string;
    checksums: Record<string, Checksum> | null;
    encoding: BufferEncoding;

    constructor(algo: string, digest: string, options?: CSParams) {
        this.algo = algo;
        this.digest = digest;
        this.checksums = null;

        if (options?.encoding) {
            this.encoding = options.encoding;
        } else {
            this.encoding = 'utf8';
        }
    }

    encode(binary: boolean): BufferEncoding {
        return binary ? 'binary' : this.encoding;
    }

    parseChecksumFile(data: string): void {
        log('Parsing checksum file...');

        this.checksums = {};
        let lineNum = 0;
        for (const line of data.trim().split(/[\r\n]+/)) {
            lineNum += 1;
            const qryLine = /^([\da-fA-F]+) ([ *])(.+)$/;
            const result = qryLine.exec(line);
            if (result === null) {
                log(`Could not parse line # ${lineNum}`);
                throw new CSErrorParse(lineNum, line);
            } else {
                result.shift();
                const [checksum, marker, file] = result;
                const isBinary = marker === '*';

                this.checksums[file] = [checksum, isBinary];
            }
        }

        log('Parsed checksums:', this.checksums);
    }

    async readFile(file: string, binary: boolean): Promise<string> {
        log(`Reading "${file} (binary mode: ${binary})"`);
        return fs.readFile(file, { encoding: this.encode(binary) });
    }

    async validate(dirBase: string, files: string[] | string): Promise<void> {
        if (typeof files === 'string') {
            files = [files];
        }

        const data = await this.readFile(this.digest, false);
        this.parseChecksumFile(data);
        await this.verifyFiles(dirBase, files);
    }

    async verifyFile(dirBase: string, file: string): Promise<void> {
        log(`Verify File: ${file}`);

        let calculated;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const metadata = this.checksums![file];
        if (!metadata) {
            throw new CSErrorNoMatch(file);
        }

        const [checksum, binary] = metadata;
        const fullPath = path.resolve(dirBase, file);

        log(`Reading file with "${this.encode(binary)}" encoding`);
        const fileToCheck = createReadStream(fullPath, {
            encoding: this.encode(binary)
        });

        const hasher = crypto.createHash(this.algo, {
            defaultEncoding: 'binary'
        });

        hasher.on('readable', () => {
            const data = hasher.read();
            if (data) {
                calculated = data.toString('hex');
            }
        });
        await pipeline(fileToCheck, hasher);

        log(`Checksum::(Expected): ${checksum}; (Actual): ${calculated}`);
        if (calculated !== checksum) {
            throw new CSErrorMismatch(file);
        }
    }

    async verifyFiles(dirBase: string, files: string[]): Promise<void[]> {
        return Promise.all(files.map((file) => this.verifyFile(dirBase, file)));
    }
}
