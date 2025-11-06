export default class StatusError extends Error {
  status: number;

  constructor(msg: string, status: number = 500) {
    super(msg);
    this.status = status;
  }
}
