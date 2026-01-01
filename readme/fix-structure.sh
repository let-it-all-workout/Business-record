#!/bin/bash
# Script to fix folder structure - move files from novagadget/ to root

cd /home/kevin/Desktop/Business-record

# Move all folders and files from novagadget/ to root
if [ -d "novagadget" ]; then
    echo "Moving files from novagadget/ to root..."
    mv novagadget/backend .
    mv novagadget/frontend .
    mv novagadget/package.json .
    mv novagadget/package-lock.json .
    mv novagadget/node_modules . 2>/dev/null || true
    mv novagadget/dist . 2>/dev/null || true
    mv novagadget/.git . 2>/dev/null || true
    mv novagadget/.gitignore . 2>/dev/null || true
    
    # Merge readme folders
    if [ -d "novagadget/readme" ]; then
        cp -r novagadget/readme/* readme/ 2>/dev/null || true
    fi
    
    # Remove empty novagadget folder
    rmdir novagadget 2>/dev/null || rm -rf novagadget
    
    echo "✅ Folder structure fixed!"
    echo "Now Business-record/ contains:"
    ls -d */ | head -5
else
    echo "novagadget folder not found - structure may already be correct"
fi

