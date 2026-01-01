# Private Scripts Directory

⚠️ **SECURITY NOTICE:** This directory contains scripts that may reference sensitive information or credentials.

## Purpose

This directory contains:
- Test scripts for authentication
- Setup scripts for initial configuration
- Utility scripts for database management
- Scripts that may contain example credentials or paths

## Important

1. **DO NOT commit these scripts to public repositories**
2. **Review scripts before running** - they may contain hardcoded values
3. **Use environment variables** instead of hardcoded credentials
4. **Remove or sanitize** any scripts before sharing codebase

## Scripts in this directory

- `test-*.js` - Authentication and login testing scripts
- `fix-*.js` - Database fix and migration scripts
- `create-*.js` - User and business creation scripts
- `reset-*.js` - Password reset scripts
- `set-*.js` - Configuration scripts
- `change-*.js` - User modification scripts
- `verify-*.js` - Verification and validation scripts

## Best Practices

1. Use environment variables for sensitive data
2. Remove hardcoded credentials
3. Sanitize console output
4. Document script purposes without exposing sensitive info
5. Keep this directory in `.gitignore`

