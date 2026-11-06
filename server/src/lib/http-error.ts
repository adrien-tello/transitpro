// Throw an HttpError from any service. The error handler turns it into:
//   { "error": { "code": "...", "message": "...", "details": ... } }
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'You must be logged in') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You are not allowed to do this') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (message: string) => new HttpError(409, 'CONFLICT', message);
export const notImplemented = (what: string) =>
  new HttpError(501, 'NOT_IMPLEMENTED', `${what} is not built yet`);
