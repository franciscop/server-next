export default class ServerUrl {
  constructor(urlString) {
    const url = new URL(urlString);
    this.href = url.href;
    this.origin = url.origin;
    this.protocol = url.protocol;
    this.username = url.username;
    this.password = url.password;
    this.host = url.host;
    this.hostname = url.hostname;
    this.port = url.port ? +url.port : null; // make it an intege
    this.pathname = url.pathname;
    this.path = url.pathname; // nicknam
    this.params = {}; // The URL parameter
    this.search = url.search;
    this.searchParams = url.searchParams;
    this.query = this.getQuery(url.searchParams.entries()); // As a plain object
    this.hash = url.hash;
  }

  getQuery(entries) {
    const query = {};
    for (const [key, value] of entries) {
      query[key] = value;
    }
    return query;
  }

  toString() {
    return this.href;
  }
}
