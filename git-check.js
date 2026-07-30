const { execSync } = require('child_process');
try {
  const status = execSync('git status --short', { cwd: 'd:\\store\\cross-border-store' }).toString();
  console.log('Git Status:');
  console.log(status || '(clean)');
  
  const log = execSync('git log --oneline -5', { cwd: 'd:\\store\\cross-border-store' }).toString();
  console.log('\nRecent commits:');
  console.log(log);
} catch (e) {
  console.error(e.message);
}