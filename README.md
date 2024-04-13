# xSumJS

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Aetherinox/xsumjs/npm-tests.yml?logo=github&label=Tests&color=%23de1f6f)
![Codecov](https://img.shields.io/codecov/c/github/Aetherinox/xsumjs?token=MPAVASGIOG&logo=codecov&logoColor=FFFFFF&label=Coverage&color=354b9e)
[![NPM package](https://img.shields.io/npm/v/xsumjs)](https://npm.im/xsumjs)

xSumJS is a Node.js package which can be used for validating file checksums and comparing them against a hash digest file. Hash digests and checksums can be generated using any of the following programs:

-   [xSum](https://github.com/Aetherinox/xsum-hash-utility)
-   [sha256sum](https://help.ubuntu.com/community/HowToSHA256SUM)
-   [DirHash](https://idrassi.github.io/DirHash/)
-   [CyberChef](https://gchq.github.io/CyberChef/)

<br />

---

<br />

## Requirements

`xsumjs` is tested with Node.js 16 (LTS) and higher

<br />

---

<br />

## Usage
The following is a simple example of how to use:

```javascript
const xs = require('xsumjs');

try
{
    await xs( algo, digest, baseDir, files );
    console.debug( 'Good Checksum' );
}
catch ( err )
{
    console.error( 'Bad Checksum', err );
}
```

<br />

This is a more advanced example:

```javascript

const xs            = require('xsumjs');
let fileList        = []; // populate fileList with your files to check
let xsParams        = { encoding: 'binary' }; // binary, utf8, etc.

await runValidator  ({ algo: 'sha256', fileList, fileDigest: 'SHA256SUM.txt', xsParams });

async function runValidator( args )
{
    console.log( `Validating checksums for files against ${ args.fileDigest }` );

    const digest        = path.join( '/path/to/', args.fileDigest );
    const checksum      = new xs.CSVerify( args.algo, digest, args.xsParams );

    await checksum.verify( '/path/base/folder/', args.fileList ).catch( err =>
    {
        
        if ( err instanceof xs.CSErrorMismatch )
        {
            console.error( `Checksum for ${ err.filename } did not match digest ${ args.fileDigest }` );
        }
        else if ( err instanceof xs.CSErrorParse )
        {
            console.error( `Digest ${ args.fileDigest } could not be loaded`, err );
        }
        else if ( err instanceof xs.CSErrorNoMatch )
        {
            console.error( `Checksum for ${ err.filename } not found in digest ${ args.fileDigest }` );
        }
        else
        {
            console.error( `Error finding checksums in ${ args.fileDigest }`, err );
        }

        process.exit( 1 );
    } );

    console.log( `All files successfully validated with digest ${ args.fileDigest }` );
}
```

<br />

---

<br />

## Hash Digests
A hash digest typically contains a list of all files you wish to track in your project to the left, formatted as the path to the file relative to your project folder, and then the checksum to the right.

<br />

```
d63ba16a664619c2dc4eb2aeef2a2e64cbc7931b831e0adf1c2275ee08e8fd47  example_file_1.txt
dfb8dacbd53eac730814ef2e9f74a47efabe5cb2a5e458bcad6380ae4c1f1f59  example_file_2.txt
9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08  sample_zip_1.zip
60303ae22b998861bce3b28f33eec1be758a213c86c93c076dbe9f558c11c752  README.md
```

<br />

---

<br />

## Development

Install `eslint`, `prettier`, and ensure files are properly formatted:

```shell
npm install -g prettier
npm install eslint --save-dev
npx prettier --write .
```

<br />

> [!NOTE]
> Note that test checksums are compared to `sha256` with `64 rounds`.

<br />

To run tests:
```shell
npm run test
```
