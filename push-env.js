const fs = require('fs');
const { execSync } = require('child_process');

try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const lines = envFile.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    
    // Split on first equals sign
    const firstEquals = line.indexOf('=');
    if (firstEquals === -1) continue;
    
    const key = line.substring(0, firstEquals).trim();
    let value = line.substring(firstEquals + 1).trim();
    
    // Remove surrounding quotes if they exist
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    
    console.log(`Pushing ${key} to Vercel...`);
    try {
      // Use printf to pipe the value exactly as is (preserves newlines if any, though bash parsing might be tricky)
      execSync(`printf "%s" "${value.replace(/\n/g, '\\n')}" | npx vercel env add ${key} production`, { stdio: 'pipe' });
      execSync(`printf "%s" "${value.replace(/\n/g, '\\n')}" | npx vercel env add ${key} preview`, { stdio: 'pipe' });
      execSync(`printf "%s" "${value.replace(/\n/g, '\\n')}" | npx vercel env add ${key} development`, { stdio: 'pipe' });
    } catch (e) {
      // Might fail if it already exists, that's okay
      console.log(`Notice: ${key} might already exist or had an issue.`);
    }
  }
  console.log("Finished pushing environment variables!");
} catch (e) {
  console.error("Failed:", e);
}
