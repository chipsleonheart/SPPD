const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const config = {
    host: '43.133.142.82',
    port: 22,
    username: 'root',
    password: 'YyA-3NZ-gym-vYb'
};

const publicKeyPath = path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519.pub');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8').trim();

console.log('Connecting to server...');
const conn = new Client();
conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(`mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "${publicKey}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('SSH Key added successfully!');
            conn.end();
            process.exit(0);
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
    process.exit(1);
}).connect(config);
