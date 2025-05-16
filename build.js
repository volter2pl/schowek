const os = require('os');
const { execSync } = require('child_process');

const platform = os.platform();
if (platform === 'win32') {
    execSync('pkg . --targets node18-win-x64 --output dist/schowek-win.exe');
} else if (platform === 'linux') {
    execSync('pkg . --targets node18-linux-x64 --output dist/schowek-linux');
}
