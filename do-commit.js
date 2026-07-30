const { execSync } = require('child_process');
try {
  execSync('git add -A', { cwd: 'd:\\store\\cross-border-store', stdio: 'inherit' });
  execSync('git commit -F fixes-commit.txt', { cwd: 'd:\\store\\cross-border-store', stdio: 'inherit' });
  console.log('Commit successful!');
} catch (e) {
  console.error('Git error:', e.message);
}