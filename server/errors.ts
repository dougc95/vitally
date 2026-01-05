/**
 * Custom error classes for authentication and authorization
 */

export class AuthenticationError extends Error {
  public statusCode = 401;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class UnauthorizedError extends Error {
  public statusCode = 403;

  constructor(message = "Access denied") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
