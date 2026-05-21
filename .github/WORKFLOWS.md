# GitHub Actions Workflows

## 📋 Overview

This repository uses GitHub Actions for CI/CD automation. All workflows are configured to use Node.js 24 to comply with GitHub's deprecation of Node.js 20.

## 🔄 Available Workflows

### 1. CI/CD Pipeline (`ci.yml`)

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual dispatch

**Jobs**:

#### Test Job
- ✅ Checkout code
- ✅ Setup Node.js 20.x
- ✅ Install dependencies
- ✅ Run linter (if available)
- ✅ Run tests (if available)
- ✅ Build frontend

#### Docker Job
- ✅ Build Docker image
- ✅ Tag with commit SHA
- ✅ Only runs on `main` branch pushes

#### Migration Job
- ✅ Validate database migrations
- ✅ Check schema integrity

### 2. Docker Build (`docker-build.yml`)

**Triggers**:
- Push to `main` branch
- Manual dispatch

**Jobs**:
- ✅ Build Docker image
- ✅ Tag as `vaimoz-livepilot:ci`

## 🔧 Configuration

### Node.js 24 Enforcement

All workflows include:
```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

This ensures compatibility with GitHub's upcoming Node.js 24 requirement.

### Actions Versions

Current versions used:
- `actions/checkout@v4` - Latest stable
- `actions/setup-node@v4` - Latest stable
- `docker/setup-buildx-action@v3` - Latest stable

## 📊 Workflow Status

Check workflow status at:
```
https://github.com/vaimozz/vaimoz-livepilot/actions
```

## 🚀 Manual Workflow Dispatch

To manually trigger workflows:

1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Choose branch
5. Click **Run workflow** button

## 🔐 Secrets & Variables

### Required Secrets (if deploying)
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password/token
- `DEPLOY_KEY` - SSH key for deployment

### Environment Variables
- `NODE_VERSION` - Node.js version (default: 20.x)
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` - Force Node.js 24 (true)

## 📝 Adding New Workflows

To add a new workflow:

1. Create file in `.github/workflows/`
2. Use `.yml` extension
3. Include Node.js 24 enforcement:
   ```yaml
   env:
     FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
   ```
4. Use latest action versions
5. Add descriptive job names
6. Include summary outputs

## 🐛 Troubleshooting

### Node.js 20 Deprecation Warning

If you see warnings about Node.js 20:
- ✅ Already fixed - workflows use Node.js 24 enforcement
- ✅ Actions updated to latest versions
- ✅ No action required

### Build Failures

1. Check workflow logs in Actions tab
2. Verify dependencies are up to date
3. Ensure all required secrets are set
4. Check Node.js version compatibility

### Docker Build Issues

1. Verify Dockerfile syntax
2. Check base image availability
3. Ensure all dependencies are installed
4. Review build logs for errors

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js 24 Migration Guide](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)
- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)

## 🔄 Workflow Updates

### Recent Changes

**2026-05-21**:
- ✅ Added Node.js 24 enforcement
- ✅ Updated all actions to latest versions
- ✅ Added comprehensive CI/CD pipeline
- ✅ Added migration validation
- ✅ Improved workflow summaries

### Upcoming Changes

- [ ] Add automated testing
- [ ] Add code coverage reports
- [ ] Add security scanning
- [ ] Add automated deployment
- [ ] Add release automation

## 📞 Support

For workflow issues:
1. Check workflow logs
2. Review this documentation
3. Check GitHub Actions status page
4. Create issue with workflow logs

---

**Last Updated**: May 21, 2026  
**Node.js Version**: 20.x (with Node.js 24 enforcement)  
**Actions Version**: v4 (latest)
