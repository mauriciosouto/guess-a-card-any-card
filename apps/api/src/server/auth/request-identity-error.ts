/** Thrown when a route requires a player identity but none could be resolved. */
export class RequestIdentityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestIdentityError";
  }
}
