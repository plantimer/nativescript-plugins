export class Auth0Error extends Error {
  static errorName = 'Auth0Error';

  constructor(message = 'please try again later', public stack: any = null) {
    super(message);
    this.name = Auth0Error.errorName;
    this.stack = stack;
  }
}
