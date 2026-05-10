/**
 * Resolver Validator
 * Validates that resolvers follow Phase B+ patterns and best practices
 *
 * Usage:
 * node resolver-validator.js
 * or
 * const { validateResolver } = require('./resolver-validator');
 * const isValid = validateResolver(resolverFunction, options);
 */

const fs = require("fs");
const path = require("path");

// ============================================
// Validation Rules
// ============================================

const ValidationRules = {
  // Authentication & Authorization
  AUTH_CHECK: {
    name: "Authentication Check",
    description: "Resolver extracts and validates user ID",
    pattern: /event\.identity\?\.claims\?\.sub|userId\s*=\s*event\.identity/,
    severity: "error",
  },
  AUTHORIZATION_CHECK: {
    name: "Authorization Check",
    description: "Resolver checks household membership or ownership",
    pattern: /checkHouseholdMembership|checkHouseholdOwner|FORBIDDEN/,
    severity: "warning", // Not all resolvers need this
  },

  // Input Validation
  INPUT_VALIDATION: {
    name: "Input Validation",
    description: "Resolver validates input using Zod or similar",
    pattern: /validateInput|z\.object|InputSchema/,
    severity: "warning",
  },

  // Error Handling
  ERROR_HANDLING: {
    name: "Error Handling",
    description: "Resolver includes try-catch or error handling",
    pattern: /try|catch|throw new Error|error\.code/,
    severity: "error",
  },
  ERROR_CODES: {
    name: "Standard Error Codes",
    description: "Uses standard error codes (UNAUTHORIZED, FORBIDDEN, etc)",
    pattern: /UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INVALID_INPUT|INTERNAL_ERROR/,
    severity: "warning",
  },

  // Observability
  LOGGING: {
    name: "Logging",
    description: "Resolver includes console.log for debugging",
    pattern: /console\.log|console\.error|logger\./,
    severity: "warning",
  },
  MONITORING: {
    name: "Monitoring Middleware",
    description: "Resolver wrapped with @withMonitoring",
    pattern: /withMonitoring|observability/,
    severity: "warning",
  },

  // Rate Limiting
  RATE_LIMITING: {
    name: "Rate Limiting",
    description: "Write operations wrapped with @withRateLimit",
    pattern: /withRateLimit|rate-limiting|rate limit/,
    severity: "warning",
  },

  // Caching
  CACHING: {
    name: "Caching Strategy",
    description: "Includes caching logic for performance",
    pattern: /cache\.|MemoryCache|CacheInvalidation|invalidate/,
    severity: "warning", // Not all resolvers need caching
  },

  // Event Logging
  EVENT_LOGGING: {
    name: "Event Logging",
    description: "Logs events for audit trail",
    pattern: /logItemEvent|logHouseholdEvent|logShoppingListEvent|event-logger/,
    severity: "warning",
  },

  // Concurrency Control
  VERSION_CHECK: {
    name: "Version Check",
    description: "Includes optimistic concurrency control",
    pattern: /_version|ConditionExpression|version.*conflict/i,
    severity: "warning", // Not all resolvers need this
  },

  // Code Style
  COMMENTS: {
    name: "Documentation",
    description: "Includes JSDoc comments on main function",
    pattern: /\/\*\*|async function|exports\.handler/,
    severity: "warning",
  },
};

// ============================================
// Core Validator
// ============================================

/**
 * Validate a resolver function source code
 * @param {string} sourceCode - Resolver source code
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateResolverCode(sourceCode, options = {}) {
  const {
    isWrite = false, // Mutation vs Query
    requiresAuth = true,
    requiresCache = false,
    requiresVersioning = false,
  } = options;

  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Check each rule
  Object.entries(ValidationRules).forEach(([ruleId, rule]) => {
    const matches = rule.pattern.test(sourceCode);

    // Determine if rule is required
    let isRequired = rule.severity === "error";
    if (ruleId === "AUTHORIZATION_CHECK" && !requiresAuth) isRequired = false;
    if (ruleId === "CACHING" && !requiresCache) isRequired = false;
    if (ruleId === "VERSION_CHECK" && !requiresVersioning) isRequired = false;
    if (ruleId === "RATE_LIMITING" && !isWrite) isRequired = false;

    if (!matches && isRequired) {
      results.valid = false;
      results.errors.push({
        rule: rule.name,
        message: rule.description,
        severity: rule.severity,
      });
    } else if (!matches) {
      results.warnings.push({
        rule: rule.name,
        message: rule.description,
      });
    } else {
      results.info.push({
        rule: rule.name,
        status: "✓",
      });
    }
  });

  // Additional checks
  const lineCount = sourceCode.split("\n").length;
  if (lineCount < 10) {
    results.warnings.push({
      rule: "Resolver Completeness",
      message: "Resolver is very short - ensure it's not incomplete",
    });
  }

  if (lineCount > 500) {
    results.warnings.push({
      rule: "Resolver Complexity",
      message: "Resolver is very large - consider breaking into helper functions",
    });
  }

  return results;
}

/**
 * Validate a resolver file
 * @param {string} filePath - Path to resolver file
 * @returns {Object} Validation result
 */
function validateResolverFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      error: `File not found: ${filePath}`,
    };
  }

  const sourceCode = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);

  // Determine resolver type from filename
  const isQuery = fileName.startsWith("Query.");
  const isMutation = fileName.startsWith("Mutation.");
  const isSubscription = fileName.startsWith("Subscription.");

  return validateResolverCode(sourceCode, {
    isWrite: isMutation,
    requiresAuth: true,
    requiresCache: isQuery,
    requiresVersioning: isMutation,
  });
}

/**
 * Validate all resolvers in a directory
 * @param {string} dirPath - Path to resolvers directory
 * @returns {Object} Validation results
 */
function validateAllResolvers(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { error: `Directory not found: ${dirPath}` };
  }

  const files = fs.readdirSync(dirPath).filter(
    (f) =>
      f.match(/^(Query|Mutation|Subscription)\..*\.js$/) &&
      !f.includes("test") &&
      !f.includes("spec")
  );

  const results = {
    totalResolvers: files.length,
    validResolvers: 0,
    invalidResolvers: 0,
    warningResolvers: 0,
    resolvers: {},
  };

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const validation = validateResolverFile(filePath);

    results.resolvers[file] = validation;

    if (validation.valid) {
      results.validResolvers++;
    } else if (validation.errors && validation.errors.length > 0) {
      results.invalidResolvers++;
    }

    if (validation.warnings && validation.warnings.length > 0) {
      results.warningResolvers++;
    }
  });

  return results;
}

// ============================================
// Reporting
// ============================================

function formatResult(result) {
  let output = "";

  // Summary
  output += `\n${"=".repeat(60)}\n`;
  output += "RESOLVER VALIDATION REPORT\n";
  output += `${"=".repeat(60)}\n\n`;

  if (result.error) {
    output += `ERROR: ${result.error}\n`;
    return output;
  }

  if (result.totalResolvers !== undefined) {
    // Directory validation
    output += `Total Resolvers: ${result.totalResolvers}\n`;
    output += `✓ Valid: ${result.validResolvers}\n`;
    output += `✗ Invalid: ${result.invalidResolvers}\n`;
    output += `⚠ Warnings: ${result.warningResolvers}\n\n`;

    // Individual resolver results
    Object.entries(result.resolvers).forEach(([file, validation]) => {
      const status =
        validation.errors && validation.errors.length > 0 ? "✗" : "✓";
      output += `${status} ${file}\n`;

      if (validation.errors && validation.errors.length > 0) {
        validation.errors.forEach((err) => {
          output += `  ✗ ${err.rule}: ${err.message}\n`;
        });
      }

      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach((warn) => {
          output += `  ⚠ ${warn.rule}: ${warn.message}\n`;
        });
      }

      output += "\n";
    });
  } else {
    // Single resolver validation
    output += `Status: ${result.valid ? "✓ VALID" : "✗ INVALID"}\n\n`;

    if (result.errors && result.errors.length > 0) {
      output += "ERRORS:\n";
      result.errors.forEach((err) => {
        output += `  ✗ ${err.rule}: ${err.message}\n`;
      });
      output += "\n";
    }

    if (result.warnings && result.warnings.length > 0) {
      output += "WARNINGS:\n";
      result.warnings.forEach((warn) => {
        output += `  ⚠ ${warn.rule}: ${warn.message}\n`;
      });
      output += "\n";
    }

    if (result.info && result.info.length > 0) {
      output += "PASSED CHECKS:\n";
      result.info.forEach((info) => {
        output += `  ${info.status} ${info.rule}\n`;
      });
      output += "\n";
    }
  }

  output += `${"=".repeat(60)}\n`;

  return output;
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const target = args[0] || "./";

  const stats = fs.statSync(target);
  let results;

  if (stats.isDirectory()) {
    results = validateAllResolvers(target);
  } else {
    results = validateResolverFile(target);
  }

  console.log(formatResult(results));

  // Exit with error code if validation failed
  if (results.invalidResolvers > 0 || (results.valid === false)) {
    process.exit(1);
  }
}

// ============================================
// Exports
// ============================================

module.exports = {
  validateResolverCode,
  validateResolverFile,
  validateAllResolvers,
  formatResult,
  ValidationRules,
};
