export abstract class ConnectionErrors {
  static invalidToken(): Error {
    return new Error('Invalid token');
  }
}
