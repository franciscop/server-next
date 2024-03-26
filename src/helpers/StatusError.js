export default class StatusError extends Error {
  constructor(msg, status = 500) {
    super(msg);
    this.status = status;
  }
}
