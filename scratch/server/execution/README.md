# Execution Backbone Modules

This directory contains the modular execution engine for Robinhood for Good.

## Modules
- `router.js`: Main router for /api/execute endpoints
- `piston.js`: Piston API integration for code run
- `judge0.js`: Judge0 API integration for code submission
- `sql.js`: PostgreSQL sandbox integration for SQL queries
- `normalize.js`: Normalizes all results to a unified shape
- `security.js`: Security middleware for validation, timeouts, and restrictions

## Usage
- Mount `router.js` at `/api/execute` in your main server
- Each endpoint delegates to the appropriate module
- All results are normalized for frontend consumption

## Security
- All endpoints use security middleware for payload validation and resource limits
- SQL runs in a dedicated sandbox with read-only role

## Extensibility
- Add new languages or execution providers by extending the relevant module

---
**Next steps:**
- Implement DB migrations for submissions, execution_results, sql_queries, test_cases, custom_test_cases
- Integrate frontend editor buttons with these endpoints
- Add further security and monitoring as needed
