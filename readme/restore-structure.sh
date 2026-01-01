#!/bin/bash
# Restore folder structure - move files from novagadget/ subfolder to root

cd /home/kevin/Desktop/Business-record

echo "Restoring folder structure..."

if [ -d "novagadget" ]; then
    # Move main folders and files to root
    if [ -d "novagadget/backend" ]; then
        mv novagadget/backend .
        echo "✅ Moved backend/"
    fi
    
    if [ -d "novagadget/frontend" ]; then
        mv novagadget/frontend .
        echo "✅ Moved frontend/"
    fi
    
    if [ -f "novagadget/package.json" ]; then
        mv novagadget/package.json .
        echo "✅ Moved package.json"
    fi
    
    if [ -f "novagadget/package-lock.json" ]; then
        mv novagadget/package-lock.json .
        echo "✅ Moved package-lock.json"
    fi
    
    if [ -d "novagadget/node_modules" ]; then
        mv novagadget/node_modules .
        echo "✅ Moved node_modules/"
    fi
    
    if [ -d "novagadget/dist" ]; then
        mv novagadget/dist .
        echo "✅ Moved dist/"
    fi
    
    # Move hidden files
    if [ -d "novagadget/.git" ]; then
        mv novagadget/.git .
        echo "✅ Moved .git/"
    fi
    
    if [ -f "novagadget/.gitignore" ]; then
        mv novagadget/.gitignore .
        echo "✅ Moved .gitignore"
    fi
    
    # Merge readme folders
    if [ -d "novagadget/readme" ]; then
        echo "Merging readme/ folders..."
        cp -n novagadget/readme/* readme/ 2>/dev/null || true
        echo "✅ Merged readme/"
    fi
    
    # Remove empty novagadget folder
    rmdir novagadget 2>/dev/null || rm -rf novagadget
    echo "✅ Removed novagadget/ folder"
    
    echo ""
    echo "✅ Folder structure restored!"
    echo ""
    echo "Current structure:"
    ls -d */ 2>/dev/null | head -5
    echo ""
    echo "Root files:"
    ls -1 *.json *.sh 2>/dev/null | head -5
else
    echo "⚠️  novagadget folder not found"
    echo "Current structure:"
    ls -d */ 2>/dev/null
fi

