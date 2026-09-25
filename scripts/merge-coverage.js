/**
 * 跑 unit + integration 兩個 jest project 的覆蓋率並合併成一份報告。
 *
 * 為什麼需要這支腳本：jest 的 `projects` 設定在同一次執行中同時跑多個 project
 * 時，覆蓋率表格會是空的（各 project 的 coverage map 互相覆寫）。所以這裡分別
 * 執行、各自輸出 json，再用 istanbul 合併。
 *
 * 用法：npm run test:coverage:all
 * 前置：integration test 需要一個可連線的 MongoDB replica set，且已跑過 npm run seed。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');

const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(ROOT, 'coverage', '.raw');

function run(project, outDir, extraArgs = []) {
    console.log(`\n=== running ${project} tests with coverage ===`);
    execFileSync(
        'npx',
        [
            'jest',
            '--selectProjects',
            project,
            '--coverage',
            '--coverageDirectory',
            outDir,
            '--coverageReporters',
            'json',
            '--forceExit',
            ...extraArgs,
        ],
        { cwd: ROOT, stdio: 'inherit' }
    );
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const unitDir = path.join(TMP, 'unit');
const intDir = path.join(TMP, 'integration');

run('unit', unitDir);
run('integration', intDir, ['--runInBand']);

const map = libCoverage.createCoverageMap({});
for (const dir of [unitDir, intDir]) {
    const file = path.join(dir, 'coverage-final.json');
    if (!fs.existsSync(file)) {
        console.error(`missing coverage output: ${file}`);
        process.exit(1);
    }
    map.merge(JSON.parse(fs.readFileSync(file, 'utf8')));
}

fs.writeFileSync(
    path.join(ROOT, 'coverage', 'coverage-final.json'),
    JSON.stringify(map.toJSON())
);

// 印出合併後的總結
const summary = libCoverage.createCoverageSummary();
map.files().forEach((f) => summary.merge(map.fileCoverageFor(f).toSummary()));
const s = summary.toJSON();

console.log('\n=== merged coverage (unit + integration) ===');
for (const key of ['statements', 'branches', 'functions', 'lines']) {
    const { covered, total, pct } = s[key];
    console.log(`  ${key.padEnd(11)} ${String(pct).padStart(6)}%  (${covered}/${total})`);
}

// 依 src/ 底下的目錄（= 架構分層）分組列出，方便找出覆蓋率偏低的層
const byDir = new Map();
map.files().forEach((f) => {
    const rel = path.relative(ROOT, f);
    const dir = path.dirname(rel);
    if (!byDir.has(dir)) byDir.set(dir, libCoverage.createCoverageSummary());
    byDir.get(dir).merge(map.fileCoverageFor(f).toSummary());
});

console.log('\n=== by layer ===');
console.log('  ' + 'directory'.padEnd(22) + 'stmts'.padStart(8) + 'branch'.padStart(9) + 'funcs'.padStart(8));
[...byDir.keys()].sort().forEach((dir) => {
    const d = byDir.get(dir).toJSON();
    console.log(
        '  ' +
            dir.padEnd(22) +
            `${d.statements.pct}%`.padStart(8) +
            `${d.branches.pct}%`.padStart(9) +
            `${d.functions.pct}%`.padStart(8)
    );
});

console.log(`\nmerged json: coverage/coverage-final.json`);
