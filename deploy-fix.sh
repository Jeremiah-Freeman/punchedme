#!/bin/bash
cd "$(dirname "$0")"

# Clear all stale git lock files
find .git -name "*.lock" -delete
echo "Cleared lock files."

# Ensure remote is set
if ! git remote get-url origin &>/dev/null; then
  git remote add origin https://github.com/Jeremiah-Freeman/punchedme.git
  echo "Added remote origin."
fi

git add -A
git commit -m "Fix password reset flow"
git push -u origin master
echo ""
echo "✅ Done! Vercel will auto-deploy in ~60 seconds."
read -p "Press Enter to close..."
