/**
 * GraphQL Schema Validator
 * Validates GraphQL schema matches Phase B+ patterns and requirements
 *
 * Usage:
 * node schema-validator.js schema.graphql
 * or
 * const { validateSchema } = require('./schema-validator');
 * const issues = validateSchema(schemaString);
 */

const fs = require('fs');
const path = require('path');

// ============================================
// Schema Validation Rules
// ============================================

const ValidationRules = {
  // Mutation naming
  MUTATION_NAMING: {
    name: 'Mutation Naming Convention',
    description: 'All mutations should follow verb_noun pattern',
    validator: (schema) => {
      const mutations = schema.match(/type Mutation\s*\{([^}]+)\}/s);
      if (!mutations) return { valid: true };

      const fields = mutations[1].match(/\w+\s*\(/g) || [];
      const invalid = fields.filter(
        (f) =>
          !f.match(
            /^(create|update|delete|mark|add|remove|accept|invite|change|bulk|export|publish|snooze|transfer)\w+/,
          ),
      );

      return {
        valid: invalid.length === 0,
        issues: invalid.map((f) => `Mutation ${f.trim()} doesn't follow convention`),
      };
    },
  },

  // Query naming
  QUERY_NAMING: {
    name: 'Query Naming Convention',
    description: 'All queries should use get/list/search pattern',
    validator: (schema) => {
      const queries = schema.match(/type Query\s*\{([^}]+)\}/s);
      if (!queries) return { valid: true };

      const fields = queries[1].match(/\w+\s*\(/g) || [];
      const invalid = fields.filter((f) => !f.match(/^(get|list|search|find|delta)\w+/));

      return {
        valid: invalid.length === 0,
        issues: invalid.map((f) => `Query ${f.trim()} doesn't follow convention`),
      };
    },
  },

  // Input types
  INPUT_TYPES: {
    name: 'Input Type Naming',
    description: "All input types should end with 'Input'",
    validator: (schema) => {
      const inputs = schema.match(/input (\w+) \{/g) || [];
      const invalid = inputs.filter((i) => !i.match(/Input \{$/));

      return {
        valid: invalid.length === 0,
        issues: invalid.map((i) => `Input type should end with 'Input': ${i}`),
      };
    },
  },

  // Error responses
  ERROR_RESPONSES: {
    name: 'Error Response Types',
    description: 'Should have standard error response types',
    validator: (schema) => {
      const hasError = schema.includes('type Error {');
      const hasErrorResponse = schema.includes('union Mutation');

      return {
        valid: hasError && hasErrorResponse,
        issues: [
          !hasError && 'Missing Error type definition',
          !hasErrorResponse && 'Missing union response types',
        ].filter(Boolean),
      };
    },
  },

  // Timestamps
  TIMESTAMPS: {
    name: 'Timestamp Fields',
    description: 'All types should have createdAt/updatedAt timestamps',
    validator: (schema) => {
      const types = schema.match(/type \w+\s*\{([^}]+)\}/g) || [];
      const invalidTypes = [];

      types.forEach((type) => {
        const typeName = type.match(/type (\w+)/)[1];
        if (typeName !== 'Error' && typeName !== 'Subscription') {
          if (!type.includes('createdAt') || !type.includes('updatedAt')) {
            invalidTypes.push(typeName);
          }
        }
      });

      return {
        valid: invalidTypes.length === 0,
        issues: invalidTypes.map((t) => `Type ${t} missing createdAt/updatedAt timestamps`),
      };
    },
  },

  // Version field
  VERSION_FIELD: {
    name: 'Version Field for Concurrency',
    description: 'Mutable types should have _version field',
    validator: (schema) => {
      const mutableTypes = schema.match(/type \w+\s*\{([^}]+)\}/g) || [];
      const invalidTypes = [];

      mutableTypes.forEach((type) => {
        const typeName = type.match(/type (\w+)/)[1];
        // Skip immutable types
        if (!['Error', 'Subscription', 'PageInfo', 'Query'].includes(typeName)) {
          if (!type.includes('_version')) {
            invalidTypes.push(typeName);
          }
        }
      });

      return {
        valid: invalidTypes.length === 0,
        issues: invalidTypes.map(
          (t) => `Type ${t} missing _version field for optimistic concurrency`,
        ),
      };
    },
  },

  // Pagination
  PAGINATION: {
    name: 'Pagination Support',
    description: 'List queries should support pagination',
    validator: (schema) => {
      const listQueries = (schema.match(/type Query[^}]*list\w+/g) || []).length;

      if (listQueries === 0) {
        return { valid: true, warnings: ['No list queries found'] };
      }

      const hasPagination = schema.includes('PageInfo') && schema.includes('first:');

      return {
        valid: hasPagination,
        issues: !hasPagination && [
          'Missing PageInfo type for pagination',
          'Missing first/after parameters on list queries',
        ],
      };
    },
  },

  // IDs
  ID_FIELDS: {
    name: 'ID Field Types',
    description: 'All ID fields should be String, not Int',
    validator: (schema) => {
      const idFields = schema.match(/\w+Id:\s*Int/g) || [];

      return {
        valid: idFields.length === 0,
        issues: idFields.map((f) => `${f} should be String! not Int`),
      };
    },
  },

  // Documentation
  DOCUMENTATION: {
    name: 'Field Documentation',
    description: 'All fields should have descriptions',
    validator: (schema) => {
      const types = schema.match(/type \w+\s*\{([^}]+)\}/g) || [];
      const undocumented = [];

      types.forEach((type) => {
        const fields = type.match(/\n\s+\w+[![\w,\s]*\)?\s*:/g) || [];
        fields.forEach((field) => {
          if (!type.includes(`"""${field}`)) {
            undocumented.push(field.trim());
          }
        });
      });

      return {
        valid: undocumented.length === 0,
        warnings: undocumented.slice(0, 5).map((f) => `Missing description: ${f}`),
      };
    },
  },

  // Mutations return types
  MUTATION_RETURNS: {
    name: 'Mutation Return Types',
    description: 'Mutations should return result type or union',
    validator: (schema) => {
      const mutations = schema.match(/type Mutation\s*\{([^}]+)\}/s);
      if (!mutations) return { valid: true };

      const fields = mutations[1].match(/\w+\([^)]*\):\s*\w+/g) || [];
      const invalid = fields.filter((f) => !f.match(/(Result|Response|Error|!|\|)/));

      return {
        valid: invalid.length === 0,
        warnings: invalid.slice(0, 3).map((f) => `Consider union return: ${f}`),
      };
    },
  },

  // Subscription patterns
  SUBSCRIPTIONS: {
    name: 'Subscription Patterns',
    description: 'Subscriptions should follow onChange pattern',
    validator: (schema) => {
      const subs = schema.match(/type Subscription\s*\{([^}]+)\}/s);
      if (!subs) return { valid: true };

      const fields = subs[1].match(/\w+\s*:/g) || [];
      const invalid = fields.filter((f) => !f.match(/^on\w+/));

      return {
        valid: invalid.length === 0,
        issues: invalid.map((f) => `Subscription ${f} should follow 'on' prefix`),
      };
    },
  },
};

// ============================================
// Validator Functions
// ============================================

/**
 * Validate GraphQL schema
 * @param {string} schemaString - GraphQL schema content
 * @returns {Object} Validation results
 */
function validateSchema(schemaString) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Parse schema
  if (!schemaString || schemaString.trim().length === 0) {
    results.valid = false;
    results.errors.push('Schema is empty');
    return results;
  }

  // Check basic GraphQL syntax
  if (!schemaString.includes('type Query') && !schemaString.includes('type Mutation')) {
    results.valid = false;
    results.errors.push('Missing Query or Mutation type');
  }

  // Run validation rules
  Object.entries(ValidationRules).forEach(([ruleId, rule]) => {
    const result = rule.validator(schemaString);

    if (!result.valid && result.issues) {
      results.valid = false;
      results.errors.push(...result.issues);
    }

    if (result.warnings) {
      results.warnings.push(...result.warnings);
    }

    if (result.valid) {
      results.info.push(`✓ ${rule.name}`);
    }
  });

  return results;
}

/**
 * Validate schema file
 * @param {string} filePath - Path to schema file
 * @returns {Object} Validation results
 */
function validateSchemaFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      error: `File not found: ${filePath}`,
    };
  }

  const schemaString = fs.readFileSync(filePath, 'utf-8');
  return validateSchema(schemaString);
}

// ============================================
// Reporting
// ============================================

function formatResults(results) {
  let output = '\n';
  output += '='.repeat(70) + '\n';
  output += 'GraphQL Schema Validation Report\n';
  output += '='.repeat(70) + '\n\n';

  if (results.error) {
    output += `ERROR: ${results.error}\n`;
    return output;
  }

  output += `Status: ${results.valid ? '✓ VALID' : '✗ INVALID'}\n\n`;

  if (results.errors.length > 0) {
    output += 'ERRORS:\n';
    results.errors.forEach((err) => {
      output += `  ✗ ${err}\n`;
    });
    output += '\n';
  }

  if (results.warnings.length > 0) {
    output += 'WARNINGS:\n';
    results.warnings.forEach((warn) => {
      output += `  ⚠ ${warn}\n`;
    });
    output += '\n';
  }

  if (results.info.length > 0) {
    output += 'PASSED CHECKS:\n';
    results.info.forEach((info) => {
      output += `  ${info}\n`;
    });
    output += '\n';
  }

  output += '='.repeat(70) + '\n';

  return output;
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const schemaPath = args[0] || './lib/appsync/schema.graphql';

  const results = validateSchemaFile(schemaPath);
  console.log(formatResults(results));

  if (!results.valid) {
    process.exit(1);
  }
}

// ============================================
// Exports
// ============================================

module.exports = {
  validateSchema,
  validateSchemaFile,
  formatResults,
  ValidationRules,
};
