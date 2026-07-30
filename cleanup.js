const { execSync } = require('child_process');
try {
  execSync('git add -A', { cwd: 'd:\\store\\cross-border-store', stdio: 'inherit' });
  execSync('git commit -m "chore: cleanup temp files"', { cwd: 'd:\\store\\cross-border-store', stdio: 'inherit' });
  console.log('Cleanup commit successful!');
} catch (e) {
  console.error('Error:', e.message);
}