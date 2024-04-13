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

import path from 'path';
import xsumjs, { CSErrorParse, CSErrorMismatch, CSVerify, CSErrorNoMatch } from '../src/';
import test from 'ava'; // eslint-disable-line import/no-unresolved

/*
    Get fixture associated to test
*/

function getFileFixture(file: string): string {
    return path.join(__dirname, 'fixtures', file);
}

/*
    Check Checksum
        fileDigest, filesToCheck
*/

function runTestChecksum(digest: string, files: string[] | string): Promise<void> {
    return xsumjs('sha256', getFileFixture(digest), getFileFixture(''), files);
}

/*
    Check valid checksum
    should return valid checksum
*/

test('Digest checksum validation: Normal file', async (t) => {
    await t.notThrowsAsync(runTestChecksum('tests-checksum.digest', 'tests-checksum-good'));
});

/*
    Check valid checksum > binary
    should return valid checksum
*/

test('Digest checksum validation:  Binary file', async (t) => {
    await t.notThrowsAsync(runTestChecksum('tests-checksum.digest', 'tests-checksum.bin'));
});

/*
    Open "fake" sha checksum file which doesnt exist and compare with file.
    fake checksum doesnt exist, so it should return an error
*/

test('Fake file checksum doesnt match good file', async (t) => {
    await t.throwsAsync(runTestChecksum('fake.sha256sum', 'tests-checksum-good'), {
        instanceOf: Error,
        code: 'ENOENT'
    });
});

/*
    Attempt to parse a checksum digest file that doesn't exist
*/

test('Checksum file parse unsuccessful', async (t) => {
    const error = (await t.throwsAsync(
        runTestChecksum('tests-checksum-invalid', 'tests-checksum-good'),
        {
            instanceOf: CSErrorParse,
            message: 'Could not parse checksum file at line #1: invalid'
        }
    )) as CSErrorParse;

    t.is(error.lineNum, 1);
    t.is(error.line, 'invalid');
});

/*
    Could not locate a file checksum in the digest file
*/

test('Specified file not found in digest', async (t) => {
    const error = (await t.throwsAsync(runTestChecksum('tests-checksum.digest', 'fake'), {
        instanceOf: CSErrorNoMatch,
        message: 'No checksum found in digest for file: "fake".'
    })) as CSErrorNoMatch;

    t.is(error.file, 'fake');
});

/*
    File checksum mismatch with digest checksum entry
*/

test('Specified file checksum mismatch in digest', async (t) => {
    const error = (await t.throwsAsync(
        runTestChecksum('tests-checksum.digest', 'tests-checksum-bad'),
        {
            instanceOf: CSErrorMismatch,
            message: '"tests-checksum-bad" does not have matching checksum'
        }
    )) as CSErrorMismatch;

    t.is(error.file, 'tests-checksum-bad');
});

/*
    Multiple files specified, at least one checksum mismatch
*/

test('Multiple files provided, one mismatch in digest', async (t) => {
    const error = (await t.throwsAsync(
        runTestChecksum('tests-checksum.digest', ['tests-checksum-good', 'tests-checksum-bad']),
        {
            instanceOf: CSErrorMismatch
        }
    )) as CSErrorMismatch;

    t.is(error.file, 'tests-checksum-bad');
});

/*
    No encoding specified; default to utf8
*/

test('Encoding: Default utf8', (t) => {
    const validator = new CSVerify('sha256', 'fake.sha256sum');
    t.is(validator.encode(false), 'utf8');
});

/*
    encoding specified; override utf8
*/

test('Encoding: Specify override', (t) => {
    const validator = new CSVerify('sha256', 'fake.sha256sum', {
        encoding: 'hex'
    });

    t.is(validator.encode(false), 'hex');
});
