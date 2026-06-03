# Implementation Plan: QA Testing Framework

## Overview

This implementation plan establishes a comprehensive Quality Assurance and Testing Framework for Vaimoz LivePilot. The framework covers automated testing across multiple layers (unit, integration, E2E), code quality enforcement, security scanning, performance testing, error monitoring, and CI/CD integration. Implementation will use JavaScript/TypeScript with Vitest, React Testing Library, Supertest, Playwright, k6, Sentry, and GitHub Actions.

The framework is designed to detect and prevent all bug categories: security vulnerabilities, data integrity issues, API errors, frontend bugs, backend bugs, and integration failures through automated quality gates.

## Tasks

- [ ] 1. Setup testing infrastructure and configuration
  - [ ] 1.1 Install and configure core testing dependencies
    - Install Vitest, @vitest/ui, and vitest configuration
    - Install React Testing Library (@testing-library/react, @testing-library/jest-dom)
    - Install Supertest for API endpoint testing
    - Install @vitest/coverage-v8 for code coverage
    - Create vitest.config.js with coverage thresholds (90% statements, 85% branches, 90% functions, 90% lines)
    - Configure test timeouts: 5000ms unit, 15000ms integration
    - _Requirements: 1.1, 1.5, 1.6, 13.1, 13.2_
  
  - [ ] 1.2 Create test database management utilities
    - Create test/helpers/database.js with setupTestDatabase function
    - Implement in-memory SQLite mode for fast tests
    - Implement file-based mode for integration tests
    - Add schema initialization from migrations
    - Add seed data functionality (1 admin user, 2 mock assets, 1 mock campaign)
    - Add transaction mode and cleanup hooks
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 12.1_

  - [ ] 1.3 Create mock service infrastructure
    - Create test/helpers/ffmpeg.js with mockFFmpegProcess function
    - Implement EventEmitter-based mock process with exit, error, stdout, stderr events
    - Add configurable behavior modes: success, error, timeout
    - Generate unique mock PIDs (10000 + random)
    - Create test/helpers/youtube.js with mockYouTubeAPI function
    - Setup MSW (Mock Service Worker) handlers for YouTube API
    - Add mock responses for broadcast creation, stream keys, OAuth validation
    - Add API error simulation (quota exceeded, invalid credentials)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 2. Implement unit testing suite
  - [ ] 2.1 Write unit tests for authentication routes
    - Test POST /api/auth/login with valid credentials (expect 200, token, user)
    - Test POST /api/auth/login with invalid password (expect 401)
    - Test GET /api/auth/me without token (expect 401)
    - Test GET /api/auth/me with valid token (expect 200, user data)
    - _Requirements: 1.1, 1.2, 1.3, 1.8_
  
  - [ ] 2.2 Write unit tests for asset management routes
    - Test GET /api/assets (list assets with authentication)
    - Test POST /api/assets/upload with valid file
    - Test POST /api/assets/upload without authentication (expect 401)
    - Test DELETE /api/assets/:id with valid asset
    - Test asset name validation and sanitization
    - _Requirements: 1.1, 1.2, 1.8_

  - [ ] 2.3 Write unit tests for campaign management routes
    - Test POST /api/campaigns (create campaign)
    - Test GET /api/campaigns (list campaigns)
    - Test PATCH /api/campaigns/:id (update campaign)
    - Test DELETE /api/campaigns/:id (delete campaign)
    - Test campaign config validation (RTMP URL, stream key)
    - _Requirements: 1.1, 1.2, 1.8_
  
  - [ ] 2.4 Write unit tests for stream control routes
    - Test POST /api/campaigns/:id/start (start stream)
    - Test POST /api/streams/:id/stop (stop stream)
    - Test GET /api/streams (list active streams)
    - Test stream status transitions
    - _Requirements: 1.1, 1.2, 1.8_
  
  - [ ]* 2.5 Write unit tests for React components
    - Test LoginPage component rendering and form submission
    - Test AssetLibraryPage component with mock API
    - Test CampaignPage component state management
    - Test StreamMonitorPage component real-time updates
    - _Requirements: 1.2, 1.8_
  
  - [ ]* 2.6 Write unit tests for utility functions
    - Test config.js environment variable parsing
    - Test serializers.js data transformation
    - Test asyncHandler.js error wrapping
    - Test API client authentication header injection
    - _Requirements: 1.1, 1.8_

- [ ] 3. Checkpoint: Verify unit test coverage
  - Run unit tests and verify coverage meets thresholds (90% backend utilities, 85% frontend components)
  - Review test output for failures and fix any broken tests
  - Ensure all tests pass and ask the user if questions arise

- [ ] 4. Implement integration testing suite
  - [ ] 4.1 Write integration tests for authentication flow
    - Test complete login flow: login → token generation → authenticated request
    - Test JWT token expiration handling
    - Test token refresh mechanism (if implemented)
    - Test authentication middleware with valid and invalid tokens
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ] 4.2 Write integration tests for campaign start with FFmpeg
    - Test campaign start with mock FFmpeg process (success behavior)
    - Test campaign start with mock FFmpeg error
    - Test campaign start with video selection from asset IDs
    - Test stream record creation in database
    - Test FFmpeg process cleanup on stream stop
    - _Requirements: 4.1, 4.2, 4.3, 4.6_
  
  - [ ] 4.3 Write integration tests for YouTube API integration
    - Test OAuth token exchange with mock YouTube API
    - Test broadcast creation with mock responses
    - Test stream key retrieval
    - Test live chat message sending
    - Test API error handling (quota exceeded, invalid credentials)
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [ ] 4.4 Write integration tests for asset upload and storage
    - Test file upload with multipart/form-data
    - Test file storage in public/uploads directory
    - Test database record creation for uploaded assets
    - Test mime-type validation
    - Test file size limit enforcement
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 4.5 Write integration tests for scheduler functionality
    - Test recurring schedule creation and execution
    - Test campaign start at scheduled time (with time mocking)
    - Test schedule history recording
    - Test schedule cancellation
    - _Requirements: 4.1, 4.2, 4.8_

- [ ] 5. Implement end-to-end testing suite
  - [ ] 5.1 Setup Playwright testing infrastructure
    - Install Playwright and @playwright/test
    - Create playwright.config.js with browsers (chromium, firefox, webkit)
    - Configure base URL (http://localhost:5173), timeout (60000ms), retries (2)
    - Setup screenshot capture on failure
    - Setup video recording for debugging
    - Create test/e2e directory structure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9_

  - [ ] 5.2 Write E2E test for user authentication workflow
    - Test login with valid credentials
    - Test redirect to dashboard after login
    - Test logout functionality
    - Test login with invalid credentials (error message)
    - Test protected route redirect to login
    - _Requirements: 5.1, 5.5, 5.6, 5.8, 5.10_
  
  - [ ] 5.3 Write E2E test for asset upload workflow
    - Navigate to asset library page
    - Test file upload via drag-and-drop or file input
    - Verify asset appears in library after upload
    - Test asset name editing
    - Test asset deletion
    - _Requirements: 5.1, 5.5, 5.6, 5.8, 5.10_
  
  - [ ] 5.4 Write E2E test for campaign creation and stream start
    - Navigate to campaign page
    - Create new campaign with Manual RTMP mode
    - Fill RTMP URL and stream key
    - Select video assets
    - Save campaign as draft
    - Start campaign and verify stream status changes to Online
    - Navigate to monitor page and verify stream appears
    - _Requirements: 5.1, 5.5, 5.6, 5.8, 5.10_

  - [ ]* 5.5 Write E2E test for stream monitoring and analytics
    - Start a campaign stream
    - Navigate to monitor page
    - Verify stream status displays correctly
    - Navigate to analytics page
    - Verify analytics data displays (stream duration, viewer stats)
    - _Requirements: 5.1, 5.5, 5.6, 5.8, 5.10_
  
  - [ ]* 5.6 Write E2E test for recurring schedule execution
    - Navigate to scheduler page
    - Create recurring schedule for a campaign
    - Verify schedule appears in scheduler panel
    - Test schedule execution (with time mocking if needed)
    - Verify schedule history updates
    - _Requirements: 5.1, 5.5, 5.6, 5.8, 5.10, 5.11_

- [ ] 6. Checkpoint: Verify integration and E2E tests
  - Run integration tests and verify all pass
  - Run E2E tests in headless mode and verify all scenarios pass
  - Review test artifacts (screenshots, videos) for any failures
  - Ensure all tests complete within timeout limits and ask the user if questions arise

- [ ] 7. Implement security testing infrastructure
  - [ ] 7.1 Setup security scanning tools
    - Install eslint-plugin-security for static code analysis
    - Configure ESLint with security rules
    - Create npm audit script for dependency scanning
    - Create security test suite in test/security directory
    - _Requirements: 6.1, 6.2, 6.6, 8.6_
  
  - [ ] 7.2 Write security tests for SQL injection prevention
    - Test login endpoint with SQL injection payloads (admin' OR '1'='1)
    - Test asset search with malicious input ('; DROP TABLE assets; --)
    - Verify parameterized queries are used throughout codebase
    - Verify no SQL injection vulnerabilities exist
    - _Requirements: 6.3, 6.8, 18.1, 18.9_
  
  - [ ] 7.3 Write security tests for XSS prevention
    - Test input fields with XSS payloads (<script>alert('XSS')</script>)
    - Test asset name input with HTML injection attempts
    - Verify input sanitization is applied
    - Verify React's built-in XSS protection works correctly
    - _Requirements: 6.4, 18.2_

  - [ ] 7.4 Write security tests for authentication and authorization
    - Test protected endpoints without token (expect 401)
    - Test protected endpoints with invalid token (expect 401)
    - Test protected endpoints with expired token (expect 401)
    - Test JWT token validation in auth middleware
    - Test authorization bypass attempts
    - _Requirements: 6.5, 6.8, 18.3, 18.4, 18.7, 18.9, 18.10_
  
  - [ ] 7.5 Write security tests for file upload validation
    - Test file upload with malicious filename (../../etc/passwd)
    - Test file upload with incorrect mime-type
    - Test file upload exceeding size limit
    - Test file upload with executable file types
    - Verify mime-type validation and size limit enforcement
    - _Requirements: 6.6, 6.8, 18.5_
  
  - [ ]* 7.6 Write security tests for command injection prevention
    - Test FFmpeg argument injection attempts
    - Verify FFmpeg command arguments are properly escaped
    - Test RTMP URL validation to prevent command injection
    - _Requirements: 6.8, 18.6_

- [ ] 8. Implement performance testing infrastructure
  - [ ] 8.1 Setup k6 for load testing
    - Install k6 (system-level or via npm)
    - Create test/performance directory
    - Create k6 test scripts for API endpoints
    - Configure load test stages: 30s ramp up to 20 VUs, 1m sustained load, 30s ramp down
    - Configure thresholds: p95 < 200ms, error rate < 1%
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 19.5, 19.6_
  
  - [ ] 8.2 Write performance tests for authentication endpoints
    - Test POST /api/auth/login under load (20 concurrent users)
    - Measure response time p95 percentile
    - Verify error rate below 1%
    - Profile memory usage during load
    - _Requirements: 7.3, 7.4, 7.9, 19.1, 19.7, 19.8_
  
  - [ ] 8.3 Write performance tests for asset and campaign endpoints
    - Test GET /api/assets under load
    - Test GET /api/campaigns under load
    - Test POST /api/campaigns under load
    - Measure response times and verify thresholds
    - _Requirements: 7.3, 7.4, 19.2, 19.3, 19.7, 19.8_

  - [ ]* 8.4 Write performance tests for stream monitoring endpoints
    - Test GET /api/streams under load
    - Test stream status polling performance
    - Verify response times remain consistent under load
    - _Requirements: 7.3, 7.4, 19.4, 19.7, 19.8_
  
  - [ ]* 8.5 Setup Lighthouse CI for frontend performance
    - Install @lhci/cli for Lighthouse CI
    - Create lighthouserc.json configuration
    - Configure performance thresholds: First Contentful Paint < 1.5s
    - Add Lighthouse CI to test scripts
    - _Requirements: 7.7, 7.8_
  
  - [ ]* 8.6 Write memory profiling tests
    - Create memory leak detection tests using process.memoryUsage()
    - Profile memory before and after API requests
    - Test FFmpeg process memory management
    - Verify no memory leaks during sustained load
    - _Requirements: 7.9, 7.10, 19.9, 19.10_

- [ ] 9. Checkpoint: Verify security and performance tests
  - Run security tests and verify all pass
  - Run npm audit and verify no critical/high vulnerabilities
  - Run performance tests and verify thresholds met
  - Review performance reports and ensure all tests pass, ask the user if questions arise

- [ ] 10. Implement code quality enforcement
  - [ ] 10.1 Setup ESLint with comprehensive rules
    - Install ESLint and necessary plugins (eslint-plugin-react, eslint-plugin-security)
    - Create .eslintrc.json with rules: no-unused-vars, no-console (warn), consistent-return
    - Add import order rules (eslint-plugin-import)
    - Add React-specific rules
    - Configure ESLint to lint both backend (.js) and frontend (.jsx) files
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [ ] 10.2 Setup Prettier for code formatting
    - Install Prettier and eslint-config-prettier (to avoid conflicts)
    - Create .prettierrc.json with formatting rules
    - Add prettier script to package.json
    - Configure format-on-save (optional for developer docs)
    - _Requirements: 8.7_
  
  - [ ] 10.3 Setup Husky and lint-staged for pre-commit hooks
    - Install Husky for git hooks
    - Install lint-staged to run linters on staged files only
    - Configure pre-commit hook to run ESLint and Prettier
    - Configure hook to block commits if linting fails
    - Test pre-commit hook functionality
    - _Requirements: 8.1, 8.2, 8.3, 8.8, 8.9, 16.7_

- [ ] 11. Implement error monitoring and logging
  - [ ] 11.1 Setup Sentry for error tracking
    - Install @sentry/node for backend error tracking
    - Install @sentry/react for frontend error tracking
    - Create Sentry initialization in backend (app.js)
    - Create Sentry initialization in frontend (main.jsx or App.jsx)
    - Configure Sentry DSN from environment variables
    - Add error boundary component for React error catching
    - _Requirements: 10.1, 10.2_
  
  - [ ] 11.2 Configure Sentry error context capture
    - Add request context capture (URL, method, headers) for backend errors
    - Add user context capture when user is authenticated
    - Add breadcrumb tracking for debugging context
    - Configure error severity levels (fatal, error, warning, info)
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ] 11.3 Setup Winston for structured logging
    - Install Winston and rotating-file-stream
    - Create logger configuration in utils/logger.js
    - Configure log levels (error, warn, info, debug)
    - Configure log rotation (daily rotation, max 7 days)
    - Add log file storage in logs/ directory
    - _Requirements: 10.8, 10.9_

  - [ ] 11.4 Integrate Winston logging throughout application
    - Add API error logging with request context
    - Add FFmpeg process crash logging
    - Add database query failure logging
    - Replace console.log with Winston logger calls
    - Test log output and rotation
    - _Requirements: 10.10, 10.11, 10.12_

- [ ] 12. Implement CI/CD pipeline with GitHub Actions
  - [ ] 12.1 Create GitHub Actions workflow file
    - Create .github/workflows/qa-tests.yml
    - Configure workflow to trigger on push and pull_request events
    - Setup Node.js environment (use actions/setup-node)
    - Add caching for node_modules (actions/cache)
    - _Requirements: 9.1, 9.2_
  
  - [ ] 12.2 Add linting and formatting checks to CI
    - Add job step to run ESLint (npm run lint)
    - Add job step to run Prettier check (npm run format:check)
    - Configure job to fail if linting errors found
    - _Requirements: 9.3, 11.1, 11.2_

  - [ ] 12.3 Add security scanning to CI
    - Add job step to run npm audit
    - Configure job to fail on critical or high severity vulnerabilities
    - Add security report generation
    - _Requirements: 9.4, 9.12_
  
  - [ ] 12.4 Add test execution to CI
    - Add job step to run unit tests (npm run test:unit)
    - Add job step to run integration tests (npm run test:integration)
    - Add job step to run E2E tests (npm run test:e2e)
    - Configure parallel test execution where possible
    - Add timeout limits (10 minutes total)
    - _Requirements: 9.5, 9.6, 9.7, 9.11, 9.15_
  
  - [ ] 12.5 Add coverage and artifact generation to CI
    - Add coverage report generation (vitest --coverage)
    - Configure coverage threshold enforcement (fail if below 85%)
    - Upload test reports as GitHub Actions artifacts
    - Upload coverage reports as artifacts
    - Upload E2E screenshots/videos as artifacts
    - Configure artifact retention (7 days)
    - _Requirements: 9.5, 9.8, 9.9, 9.10, 9.13, 14.9, 14.10_

  - [ ] 12.6 Configure quality gates and PR protection
    - Configure GitHub branch protection for main branch
    - Require status checks to pass before merge
    - Add quality gate logic: fail on test failures, security issues, low coverage
    - Test CI pipeline end-to-end with sample PR
    - _Requirements: 9.11, 9.12, 9.13, 9.14_

- [ ] 13. Implement test configuration and reporting
  - [ ] 13.1 Create comprehensive test configuration files
    - Update vitest.config.js with final coverage thresholds
    - Update playwright.config.js with final settings
    - Create test/config.js for shared test configuration
    - Document configuration options in test README
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [ ] 13.2 Setup test data management
    - Create test/fixtures directory for reusable test data
    - Create mock data factories (mockUser, mockAsset, mockCampaign)
    - Create helper functions for test data generation
    - Document test data patterns for maintainability
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 13.3 Configure test reporting and artifacts
    - Setup HTML coverage report generation (@vitest/coverage-v8)
    - Configure test summary report (JSON and console output)
    - Setup test execution time tracking
    - Configure test artifact cleanup (7 day retention)
    - Create test report viewer scripts
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.10_
  
  - [ ]* 13.4 Implement flaky test detection and handling
    - Configure automatic retry for failed tests (2 retries for local, 3 for CI)
    - Add flaky test marking in reports
    - Track flaky test rate across runs
    - Create flaky test report generation
    - Add alerts for high flaky test rate (>5%)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ] 14. Implement test isolation and cleanup
  - [ ] 14.1 Ensure test isolation mechanisms
    - Verify each test gets fresh database instance
    - Add beforeEach/afterEach hooks for cleanup
    - Implement mock state reset between tests
    - Add temporary file cleanup after tests
    - Add process cleanup for spawned processes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ] 14.2 Verify test isolation with random execution
    - Run tests in random order to detect shared state issues
    - Run tests in parallel to detect race conditions
    - Fix any tests that fail due to shared state
    - Document isolation best practices for developers
    - _Requirements: 12.7_

- [ ] 15. Create test documentation and maintenance guidelines
  - [ ] 15.1 Write comprehensive test documentation
    - Create test/README.md with testing overview
    - Document test structure (unit, integration, E2E)
    - Document how to run tests locally
    - Document how to write new tests
    - Add troubleshooting section for common issues
    - _Requirements: 20.7_
  
  - [ ] 15.2 Document test maintenance best practices
    - Document naming conventions (describe feature, it behavior)
    - Document Arrange-Act-Assert pattern usage
    - Document DRY principle for test helpers
    - Document when to update tests (API changes, feature removal)
    - Add code review guidelines for tests
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.8, 20.9, 20.10_

  - [ ] 15.3 Create npm scripts for developer experience
    - Add script: "test" (run all tests)
    - Add script: "test:unit" (unit tests only)
    - Add script: "test:integration" (integration tests only)
    - Add script: "test:e2e" (E2E tests only)
    - Add script: "test:watch" (watch mode for TDD)
    - Add script: "test:coverage" (with coverage report)
    - Add script: "test:security" (security tests only)
    - Add script: "test:performance" (k6 load tests)
    - Add script: "lint" (ESLint check)
    - Add script: "format" (Prettier format)
    - Add script: "format:check" (Prettier check only)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [ ] 16. Final integration and validation
  - [ ] 16.1 Run complete test suite end-to-end
    - Run all unit tests and verify coverage thresholds met
    - Run all integration tests and verify all pass
    - Run all E2E tests and verify all scenarios work
    - Run security scan and verify no critical/high vulnerabilities
    - Run performance tests and verify thresholds met
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11_

  - [ ] 16.2 Test CI/CD pipeline with real pull request
    - Create test branch with sample changes
    - Open pull request and verify CI workflow triggers
    - Verify all quality gates pass
    - Test failure scenarios (intentionally break tests)
    - Verify PR blocking when tests fail
    - _Requirements: 9.1, 9.11, 9.14_
  
  - [ ] 16.3 Validate error monitoring in staging/production
    - Deploy application with Sentry integration
    - Generate test errors and verify Sentry captures them
    - Verify error context includes request info and user data
    - Test Winston logging and log rotation
    - Verify logs are properly structured and searchable
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.8, 10.9, 10.10, 10.11, 10.12_
  
  - [ ] 16.4 Create QA framework usage guide
    - Document how to run tests locally
    - Document how to add new test cases
    - Document CI/CD workflow and quality gates
    - Document error monitoring setup and usage
    - Document performance testing procedures
    - Add examples and best practices
    - _Requirements: 16.8, 20.7_

- [ ] 17. Final checkpoint and handoff
  - Verify all tasks completed and tests passing
  - Verify CI/CD pipeline is functional
  - Verify documentation is complete
  - Run full test suite one final time
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements from requirements.md for traceability
- Checkpoints ensure incremental validation at key milestones
- Testing framework should be implemented iteratively: core infrastructure first, then test suites, then advanced features
- Pre-commit hooks will improve developer experience by catching issues early
- CI/CD integration ensures automated quality gates on every commit
- Error monitoring (Sentry + Winston) provides production observability
- Performance testing ensures the application meets response time and throughput requirements
- Security testing prevents vulnerabilities from reaching production

## Implementation Order

1. **Foundation (Tasks 1-3)**: Setup infrastructure, database helpers, mock services, and unit tests
2. **Integration & E2E (Tasks 4-6)**: Build integration tests and end-to-end test suites
3. **Security & Performance (Tasks 7-9)**: Add security scanning and performance testing
4. **Quality & CI/CD (Tasks 10-12)**: Enforce code quality, add pre-commit hooks, setup GitHub Actions
5. **Configuration & Monitoring (Tasks 13-14)**: Configure reporting, error monitoring, test isolation
6. **Documentation & Validation (Tasks 15-17)**: Document practices, validate end-to-end, finalize

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "2.3", "2.4"]
    },
    {
      "id": 2,
      "tasks": ["2.5", "2.6", "4.1", "4.2", "4.3", "4.4"]
    },
    {
      "id": 3,
      "tasks": ["4.5", "5.1"]
    },
    {
      "id": 4,
      "tasks": ["5.2", "5.3", "5.4"]
    },
    {
      "id": 5,
      "tasks": ["5.5", "5.6", "7.1"]
    },
    {
      "id": 6,
      "tasks": ["7.2", "7.3", "7.4", "7.5"]
    },
    {
      "id": 7,
      "tasks": ["7.6", "8.1"]
    },
    {
      "id": 8,
      "tasks": ["8.2", "8.3", "8.4"]
    },
    {
      "id": 9,
      "tasks": ["8.5", "8.6", "10.1", "10.2"]
    },
    {
      "id": 10,
      "tasks": ["10.3", "11.1"]
    },
    {
      "id": 11,
      "tasks": ["11.2", "11.3"]
    },
    {
      "id": 12,
      "tasks": ["11.4", "12.1"]
    },
    {
      "id": 13,
      "tasks": ["12.2", "12.3", "12.4"]
    },
    {
      "id": 14,
      "tasks": ["12.5", "12.6", "13.1"]
    },
    {
      "id": 15,
      "tasks": ["13.2", "13.3"]
    },
    {
      "id": 16,
      "tasks": ["13.4", "14.1"]
    },
    {
      "id": 17,
      "tasks": ["14.2", "15.1"]
    },
    {
      "id": 18,
      "tasks": ["15.2", "15.3"]
    },
    {
      "id": 19,
      "tasks": ["16.1", "16.2"]
    },
    {
      "id": 20,
      "tasks": ["16.3", "16.4"]
    }
  ]
}
```
