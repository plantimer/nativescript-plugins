export abstract class ConnectionErrors {
  static invalidToken(): Error {
    return new Error('Invalid token');
  }

  static unavailableBrowser() {
    return new Error('The browser is not available');
  }
}
