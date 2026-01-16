import { spawnSync } from 'node:child_process';

function commandExists(cmd) {
	const isWin = process.platform === 'win32';
	const which = isWin ? 'where' : 'which';
	const res = spawnSync(which, [cmd], { stdio: 'ignore', shell: true });
	return res.status === 0;
}

function runVersion(cmd) {
	const res = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: true });
	if (res.status !== 0) {
		return null;
	}
	return (res.stdout || '').trim();
}

const missing = [];
if (!commandExists('cargo')) missing.push('cargo');
if (!commandExists('rustc')) missing.push('rustc');

if (missing.length) {
	console.error(`Missing required tool(s): ${missing.join(', ')}`);
	console.error('Tauri requires Rust (cargo + rustc). Install via https://rustup.rs/ and reopen your terminal.');
	process.exit(1);
}

const cargoVer = runVersion('cargo');
const rustcVer = runVersion('rustc');

console.log('Tauri preflight OK');
if (cargoVer) console.log(`- ${cargoVer}`);
if (rustcVer) console.log(`- ${rustcVer}`);

if (process.platform === 'win32') {
	console.log('Windows notes:');
	console.log('- Ensure Visual Studio Build Tools (Desktop development with C++) is installed.');
	console.log('- Ensure WebView2 Runtime is installed (often already on Win10/11).');
}
