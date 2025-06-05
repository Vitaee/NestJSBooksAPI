# GitHub Workflows

This repository contains several GitHub Actions workflows to ensure code quality, run tests etc.

## Workflows Overview

### CI Workflow (`ci.yml`)
**Trigger:** Push to main/master/develop, Pull Requests

**What it does:**
- Runs tests on Node.js 22.x and 24.x
- Sets up PostgreSQL database for testing
- Executes linting, type checking, unit tests, and e2e tests
- Generates test coverage reports
- Builds the application
- Uploads build artifacts

### Code Quality (`code-quality.yml`)
**Trigger:** Push to main/master/develop, Pull Requests, Weekly schedule

**What it does:**
- Runs Prettier formatting checks
- Executes ESLint for code quality
- Performs TypeScript type checking
- Runs security audits (npm audit)
- Checks for outdated dependencies
- Runs Snyk vulnerability scanning (requires SNYK_TOKEN secret)
- Performs CodeQL security analysis

### 🚀 Deploy (`deploy.yml`)
**Trigger:** Push to main/master, After successful CI workflow

Might add deployment automation workflow.


## Branch Protection

We might need to  set up branch protection rules for `main / prod`:

