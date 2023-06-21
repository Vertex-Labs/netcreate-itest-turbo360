#!/usr/bin/env node
const shell = require('shelljs');
let argv = require('minimist')(process.argv.slice(2));
let dataset = argv['dataset'];
let googlea = argv['googlea'];
let port = argv['port'];
let netport = argv['netport'];
let ip = argv['ip'];
let fs = require('fs');

let netportDef;
let ipDef;

shell.echo(`
    +------------------------+
    | NC -- NetCreate Config |
    +------------------------+

    This script will select and load the Net.Create project in:

        /build/runtime/projectname.loki
        /build/runtime/projectname.template

    If 'projectname' does not exist, the script will create a new project.


    - - - - - - - - - -
    Starting script...

    1. Setting dataset to ${dataset}...`);

// dataset
if (dataset === undefined || dataset === '') {
  shell.echo(`
    **** ERROR: NO DATASET DEFINED ****

    Make sure you define a dataset with

        ./nc.js --dataset=projectname

    e.g. if you're trying to load "tacitus",
    the syntax is './nc.js --dataset=tacitus'\n
    `);
  shell.exit();
}

// google analytics
if (googlea === undefined || googlea === '') {
  shell.echo(`
    2. Google Analytics will not be used.
       Use the flag --googlea=XXXX to load google analyics for ID XXXX.`);
  googlea = 0;
} else {
  shell.echo(`
    2. Using Google Analyics with:${googlea}.
       If you want to disable google analytics, leave this flag off or set to 0.`);
}

// port
if (port === undefined || port === '') {
  port = 3000;
}
shell.echo(`
    3. Setting port to ${port}
       Use './nc.js --port=xxxx' to define a different port.`);

// netport
if (netport === undefined || netport === '') {
  netportDef = '';
  shell.echo(`
    4. Using default netport
       Use './nc.js --netport=xxxx' to define a specific network port.
       (This is usually only needed when running multiple servers on the same host)`);
} else {
  netportDef = `\n  netport: "${netport}",`;
  shell.echo(`
    4. Setting netport to ${netport}
       Use './nc.js --netport=xxx.xxx.xxx' to define a specific network port.
       (This is usually only needed when running multiple servers on the same host)`);
}

// ip
if (ip === undefined || ip === '') {
  ipDef = '';
  shell.echo(`
    5. Using default ip
       Use './nc.js --ip=xxx.xxx.xxx' to define a specific ip address.
       (This is usually only needed on specialized hosts, e.g. EC2, Docker)`);
} else {
  ipDef = `\n  ip: "${ip}",`;
  shell.echo(`
    5. Setting ip to ${ip}
       Use './nc.js --ip=xxx.xxx.xxx' to define a specific ip address.
       (This is usually only needed on specialized hosts, e.g. EC2, Docker)`);
}

let script = `
// this file generated by NC command
const NC_CONFIG = {
  dataset: "${dataset}",
  port: "${port}",${netportDef}${ipDef}
  googlea: "${googlea}"
};
if (typeof process === "object") module.exports = NC_CONFIG;
if (typeof window === "object") window.NC_CONFIG = NC_CONFIG;
`;

const nccPath = 'app-config';
if (!fs.existsSync(nccPath)) fs.mkdirSync(nccPath, { recursive: true });
shell.ShellString(script).to(`${nccPath}/netcreate-config.js`);

shell.echo(`
    6. Starting dev server...
\n
\n`);

shell.exec('npm run dev');
