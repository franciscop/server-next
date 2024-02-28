var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// node:http
var exports_http = {};
__export(exports_http, {
  request: () => {
    {
      return ou;
    }
  },
  globalAgent: () => {
    {
      return lu;
    }
  },
  get: () => {
    {
      return au;
    }
  },
  default: () => {
    {
      return iu;
    }
  },
  STATUS_CODES: () => {
    {
      return hu;
    }
  },
  METHODS: () => {
    {
      return cu;
    }
  },
  IncomingMessage: () => {
    {
      return fu;
    }
  },
  ClientRequest: () => {
    {
      return su;
    }
  },
  Agent: () => {
    {
      return uu;
    }
  }
});
var oe, Gs, yi, dr, Gi, ke, Ki, Vi, Yi, Xi, vr, b2, Er, xr, Rr, dt, gt, Q, bt, _t, qr, Dr, _e, Lt, an, Ft, fe, Nt, pn, Dt, ue, Sn, Bn, Kt, Qe, Vt, et, On, Nn, Ht, ir, zn, ti, ar, ur, fi, li, ci, _i, pi, js, Hs, Ws, $s, hr, K, cr, gi, Ks, di, wi, pr, yr, mi, bi, Vs, Ys, vi, xi, Si, Ni, Di, Hi, _r, iu, ou, au, su, fu, uu, lu, hu, cu;
var init_http = __esm(() => {
  oe = function(e) {
    throw new RangeError($s[e]);
  };
  Gs = function(e, t) {
    let r = [], n = e.length;
    for (;n--; )
      r[n] = t(e[n]);
    return r;
  };
  yi = function(e, t) {
    let r = e.split("@"), n = "";
    r.length > 1 && (n = r[0] + "@", e = r[1]), e = e.replace(Ws, ".");
    let i = e.split("."), o = Gs(i, t).join(".");
    return n + o;
  };
  dr = function(e) {
    let t = [], r = 0, n = e.length;
    for (;r < n; ) {
      let i = e.charCodeAt(r++);
      if (i >= 55296 && i <= 56319 && r < n) {
        let o = e.charCodeAt(r++);
        (o & 64512) == 56320 ? t.push(((i & 1023) << 10) + (o & 1023) + 65536) : (t.push(i), r--);
      } else
        t.push(i);
    }
    return t;
  };
  Gi = Object.create;
  ke = Object.defineProperty;
  Ki = Object.getOwnPropertyDescriptor;
  Vi = Object.getOwnPropertyNames;
  Yi = Object.getPrototypeOf;
  Xi = Object.prototype.hasOwnProperty;
  vr = (e, t) => () => (e && (t = e(e = 0)), t);
  b2 = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  Er = (e, t) => {
    for (var r in t)
      ke(e, r, { get: t[r], enumerable: true });
  };
  xr = (e, t, r, n) => {
    if (t && typeof t == "object" || typeof t == "function")
      for (let i of Vi(t))
        !Xi.call(e, i) && i !== r && ke(e, i, { get: () => t[i], enumerable: !(n = Ki(t, i)) || n.enumerable });
    return e;
  };
  Rr = (e, t, r) => (r = e != null ? Gi(Yi(e)) : {}, xr(t || !e || !e.__esModule ? ke(r, "default", { value: e, enumerable: true }) : r, e));
  dt = (e) => xr(ke({}, "__esModule", { value: true }), e);
  gt = b2((N) => {
    N.fetch = Ce(global.fetch) && Ce(global.ReadableStream);
    N.writableStream = Ce(global.WritableStream);
    N.abortController = Ce(global.AbortController);
    var J;
    function pt() {
      if (J !== undefined)
        return J;
      if (global.XMLHttpRequest) {
        J = new global.XMLHttpRequest;
        try {
          J.open("GET", global.XDomainRequest ? "/" : "https://example.com");
        } catch {
          J = null;
        }
      } else
        J = null;
      return J;
    }
    function yt(e) {
      var t = pt();
      if (!t)
        return false;
      try {
        return t.responseType = e, t.responseType === e;
      } catch {
      }
      return false;
    }
    N.arraybuffer = N.fetch || yt("arraybuffer");
    N.msstream = !N.fetch && yt("ms-stream");
    N.mozchunkedarraybuffer = !N.fetch && yt("moz-chunked-arraybuffer");
    N.overrideMimeType = N.fetch || (pt() ? Ce(pt().overrideMimeType) : false);
    function Ce(e) {
      return typeof e == "function";
    }
    J = null;
  });
  Q = b2((Rf, wt) => {
    typeof Object.create == "function" ? wt.exports = function(t, r) {
      r && (t.super_ = r, t.prototype = Object.create(r.prototype, { constructor: { value: t, enumerable: false, writable: true, configurable: true } }));
    } : wt.exports = function(t, r) {
      if (r) {
        t.super_ = r;
        var n = function() {
        };
        n.prototype = r.prototype, t.prototype = new n, t.prototype.constructor = t;
      }
    };
  });
  bt = b2((Sf, mt) => {
    var ye = typeof Reflect == "object" ? Reflect : null, Sr = ye && typeof ye.apply == "function" ? ye.apply : function(t, r, n) {
      return Function.prototype.apply.call(t, r, n);
    }, je;
    ye && typeof ye.ownKeys == "function" ? je = ye.ownKeys : Object.getOwnPropertySymbols ? je = function(t) {
      return Object.getOwnPropertyNames(t).concat(Object.getOwnPropertySymbols(t));
    } : je = function(t) {
      return Object.getOwnPropertyNames(t);
    };
    function zi(e) {
      console && console.warn && console.warn(e);
    }
    var Ar = Number.isNaN || function(t) {
      return t !== t;
    };
    function x() {
      x.init.call(this);
    }
    mt.exports = x;
    mt.exports.once = eo;
    x.EventEmitter = x;
    x.prototype._events = undefined;
    x.prototype._eventsCount = 0;
    x.prototype._maxListeners = undefined;
    var Tr = 10;
    function He(e) {
      if (typeof e != "function")
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof e);
    }
    Object.defineProperty(x, "defaultMaxListeners", { enumerable: true, get: function() {
      return Tr;
    }, set: function(e) {
      if (typeof e != "number" || e < 0 || Ar(e))
        throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + e + ".");
      Tr = e;
    } });
    x.init = function() {
      (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) && (this._events = Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || undefined;
    };
    x.prototype.setMaxListeners = function(t) {
      if (typeof t != "number" || t < 0 || Ar(t))
        throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + t + ".");
      return this._maxListeners = t, this;
    };
    function Br(e) {
      return e._maxListeners === undefined ? x.defaultMaxListeners : e._maxListeners;
    }
    x.prototype.getMaxListeners = function() {
      return Br(this);
    };
    x.prototype.emit = function(t) {
      for (var r = [], n = 1;n < arguments.length; n++)
        r.push(arguments[n]);
      var i = t === "error", o = this._events;
      if (o !== undefined)
        i = i && o.error === undefined;
      else if (!i)
        return false;
      if (i) {
        var a;
        if (r.length > 0 && (a = r[0]), a instanceof Error)
          throw a;
        var s = new Error("Unhandled error." + (a ? " (" + a.message + ")" : ""));
        throw s.context = a, s;
      }
      var u = o[t];
      if (u === undefined)
        return false;
      if (typeof u == "function")
        Sr(u, this, r);
      else
        for (var l = u.length, h2 = Or(u, l), n = 0;n < l; ++n)
          Sr(h2[n], this, r);
      return true;
    };
    function Cr(e, t, r, n) {
      var i, o, a;
      if (He(r), o = e._events, o === undefined ? (o = e._events = Object.create(null), e._eventsCount = 0) : (o.newListener !== undefined && (e.emit("newListener", t, r.listener ? r.listener : r), o = e._events), a = o[t]), a === undefined)
        a = o[t] = r, ++e._eventsCount;
      else if (typeof a == "function" ? a = o[t] = n ? [r, a] : [a, r] : n ? a.unshift(r) : a.push(r), i = Br(e), i > 0 && a.length > i && !a.warned) {
        a.warned = true;
        var s = new Error("Possible EventEmitter memory leak detected. " + a.length + " " + String(t) + " listeners added. Use emitter.setMaxListeners() to increase limit");
        s.name = "MaxListenersExceededWarning", s.emitter = e, s.type = t, s.count = a.length, zi(s);
      }
      return e;
    }
    x.prototype.addListener = function(t, r) {
      return Cr(this, t, r, false);
    };
    x.prototype.on = x.prototype.addListener;
    x.prototype.prependListener = function(t, r) {
      return Cr(this, t, r, true);
    };
    function Zi() {
      if (!this.fired)
        return this.target.removeListener(this.type, this.wrapFn), this.fired = true, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
    }
    function Ir(e, t, r) {
      var n = { fired: false, wrapFn: undefined, target: e, type: t, listener: r }, i = Zi.bind(n);
      return i.listener = r, n.wrapFn = i, i;
    }
    x.prototype.once = function(t, r) {
      return He(r), this.on(t, Ir(this, t, r)), this;
    };
    x.prototype.prependOnceListener = function(t, r) {
      return He(r), this.prependListener(t, Ir(this, t, r)), this;
    };
    x.prototype.removeListener = function(t, r) {
      var n, i, o, a, s;
      if (He(r), i = this._events, i === undefined)
        return this;
      if (n = i[t], n === undefined)
        return this;
      if (n === r || n.listener === r)
        --this._eventsCount === 0 ? this._events = Object.create(null) : (delete i[t], i.removeListener && this.emit("removeListener", t, n.listener || r));
      else if (typeof n != "function") {
        for (o = -1, a = n.length - 1;a >= 0; a--)
          if (n[a] === r || n[a].listener === r) {
            s = n[a].listener, o = a;
            break;
          }
        if (o < 0)
          return this;
        o === 0 ? n.shift() : Ji(n, o), n.length === 1 && (i[t] = n[0]), i.removeListener !== undefined && this.emit("removeListener", t, s || r);
      }
      return this;
    };
    x.prototype.off = x.prototype.removeListener;
    x.prototype.removeAllListeners = function(t) {
      var r, n, i;
      if (n = this._events, n === undefined)
        return this;
      if (n.removeListener === undefined)
        return arguments.length === 0 ? (this._events = Object.create(null), this._eventsCount = 0) : n[t] !== undefined && (--this._eventsCount === 0 ? this._events = Object.create(null) : delete n[t]), this;
      if (arguments.length === 0) {
        var o = Object.keys(n), a;
        for (i = 0;i < o.length; ++i)
          a = o[i], a !== "removeListener" && this.removeAllListeners(a);
        return this.removeAllListeners("removeListener"), this._events = Object.create(null), this._eventsCount = 0, this;
      }
      if (r = n[t], typeof r == "function")
        this.removeListener(t, r);
      else if (r !== undefined)
        for (i = r.length - 1;i >= 0; i--)
          this.removeListener(t, r[i]);
      return this;
    };
    function Lr(e, t, r) {
      var n = e._events;
      if (n === undefined)
        return [];
      var i = n[t];
      return i === undefined ? [] : typeof i == "function" ? r ? [i.listener || i] : [i] : r ? Qi(i) : Or(i, i.length);
    }
    x.prototype.listeners = function(t) {
      return Lr(this, t, true);
    };
    x.prototype.rawListeners = function(t) {
      return Lr(this, t, false);
    };
    x.listenerCount = function(e, t) {
      return typeof e.listenerCount == "function" ? e.listenerCount(t) : Mr.call(e, t);
    };
    x.prototype.listenerCount = Mr;
    function Mr(e) {
      var t = this._events;
      if (t !== undefined) {
        var r = t[e];
        if (typeof r == "function")
          return 1;
        if (r !== undefined)
          return r.length;
      }
      return 0;
    }
    x.prototype.eventNames = function() {
      return this._eventsCount > 0 ? je(this._events) : [];
    };
    function Or(e, t) {
      for (var r = new Array(t), n = 0;n < t; ++n)
        r[n] = e[n];
      return r;
    }
    function Ji(e, t) {
      for (;t + 1 < e.length; t++)
        e[t] = e[t + 1];
      e.pop();
    }
    function Qi(e) {
      for (var t = new Array(e.length), r = 0;r < t.length; ++r)
        t[r] = e[r].listener || e[r];
      return t;
    }
    function eo(e, t) {
      return new Promise(function(r, n) {
        function i(a) {
          e.removeListener(t, o), n(a);
        }
        function o() {
          typeof e.removeListener == "function" && e.removeListener("error", i), r([].slice.call(arguments));
        }
        Fr(e, t, o, { once: true }), t !== "error" && to(e, i, { once: true });
      });
    }
    function to(e, t, r) {
      typeof e.on == "function" && Fr(e, "error", t, r);
    }
    function Fr(e, t, r, n) {
      if (typeof e.on == "function")
        n.once ? e.once(t, r) : e.on(t, r);
      else if (typeof e.addEventListener == "function")
        e.addEventListener(t, function i(o) {
          n.once && e.removeEventListener(t, i), r(o);
        });
      else
        throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof e);
    }
  });
  _t = b2((Tf, Nr) => {
    Nr.exports = bt().EventEmitter;
  });
  qr = b2((We) => {
    We.byteLength = no;
    We.toByteArray = oo;
    We.fromByteArray = fo;
    var H = [], U = [], ro = typeof Uint8Array < "u" ? Uint8Array : Array, vt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (ae = 0, Ur = vt.length;ae < Ur; ++ae)
      H[ae] = vt[ae], U[vt.charCodeAt(ae)] = ae;
    var ae, Ur;
    U["-".charCodeAt(0)] = 62;
    U["_".charCodeAt(0)] = 63;
    function Pr(e) {
      var t = e.length;
      if (t % 4 > 0)
        throw new Error("Invalid string. Length must be a multiple of 4");
      var r = e.indexOf("=");
      r === -1 && (r = t);
      var n = r === t ? 0 : 4 - r % 4;
      return [r, n];
    }
    function no(e) {
      var t = Pr(e), r = t[0], n = t[1];
      return (r + n) * 3 / 4 - n;
    }
    function io(e, t, r) {
      return (t + r) * 3 / 4 - r;
    }
    function oo(e) {
      var t, r = Pr(e), n = r[0], i = r[1], o = new ro(io(e, n, i)), a = 0, s = i > 0 ? n - 4 : n, u;
      for (u = 0;u < s; u += 4)
        t = U[e.charCodeAt(u)] << 18 | U[e.charCodeAt(u + 1)] << 12 | U[e.charCodeAt(u + 2)] << 6 | U[e.charCodeAt(u + 3)], o[a++] = t >> 16 & 255, o[a++] = t >> 8 & 255, o[a++] = t & 255;
      return i === 2 && (t = U[e.charCodeAt(u)] << 2 | U[e.charCodeAt(u + 1)] >> 4, o[a++] = t & 255), i === 1 && (t = U[e.charCodeAt(u)] << 10 | U[e.charCodeAt(u + 1)] << 4 | U[e.charCodeAt(u + 2)] >> 2, o[a++] = t >> 8 & 255, o[a++] = t & 255), o;
    }
    function ao(e) {
      return H[e >> 18 & 63] + H[e >> 12 & 63] + H[e >> 6 & 63] + H[e & 63];
    }
    function so(e, t, r) {
      for (var n, i = [], o = t;o < r; o += 3)
        n = (e[o] << 16 & 16711680) + (e[o + 1] << 8 & 65280) + (e[o + 2] & 255), i.push(ao(n));
      return i.join("");
    }
    function fo(e) {
      for (var t, r = e.length, n = r % 3, i = [], o = 16383, a = 0, s = r - n;a < s; a += o)
        i.push(so(e, a, a + o > s ? s : a + o));
      return n === 1 ? (t = e[r - 1], i.push(H[t >> 2] + H[t << 4 & 63] + "==")) : n === 2 && (t = (e[r - 2] << 8) + e[r - 1], i.push(H[t >> 10] + H[t >> 4 & 63] + H[t << 2 & 63] + "=")), i.join("");
    }
  });
  Dr = b2((Et) => {
    Et.read = function(e, t, r, n, i) {
      var o, a, s = i * 8 - n - 1, u = (1 << s) - 1, l = u >> 1, h2 = -7, c = r ? i - 1 : 0, d = r ? -1 : 1, p = e[t + c];
      for (c += d, o = p & (1 << -h2) - 1, p >>= -h2, h2 += s;h2 > 0; o = o * 256 + e[t + c], c += d, h2 -= 8)
        ;
      for (a = o & (1 << -h2) - 1, o >>= -h2, h2 += n;h2 > 0; a = a * 256 + e[t + c], c += d, h2 -= 8)
        ;
      if (o === 0)
        o = 1 - l;
      else {
        if (o === u)
          return a ? NaN : (p ? -1 : 1) * (1 / 0);
        a = a + Math.pow(2, n), o = o - l;
      }
      return (p ? -1 : 1) * a * Math.pow(2, o - n);
    };
    Et.write = function(e, t, r, n, i, o) {
      var a, s, u, l = o * 8 - i - 1, h2 = (1 << l) - 1, c = h2 >> 1, d = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, p = n ? 0 : o - 1, g = n ? 1 : -1, E2 = t < 0 || t === 0 && 1 / t < 0 ? 1 : 0;
      for (t = Math.abs(t), isNaN(t) || t === 1 / 0 ? (s = isNaN(t) ? 1 : 0, a = h2) : (a = Math.floor(Math.log(t) / Math.LN2), t * (u = Math.pow(2, -a)) < 1 && (a--, u *= 2), a + c >= 1 ? t += d / u : t += d * Math.pow(2, 1 - c), t * u >= 2 && (a++, u /= 2), a + c >= h2 ? (s = 0, a = h2) : a + c >= 1 ? (s = (t * u - 1) * Math.pow(2, i), a = a + c) : (s = t * Math.pow(2, c - 1) * Math.pow(2, i), a = 0));i >= 8; e[r + p] = s & 255, p += g, s /= 256, i -= 8)
        ;
      for (a = a << i | s, l += i;l > 0; e[r + p] = a & 255, p += g, a /= 256, l -= 8)
        ;
      e[r + p - g] |= E2 * 128;
    };
  });
  _e = b2((be) => {
    var xt = qr(), we = Dr(), kr = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
    be.Buffer = f;
    be.SlowBuffer = yo;
    be.INSPECT_MAX_BYTES = 50;
    var $e = 2147483647;
    be.kMaxLength = $e;
    f.TYPED_ARRAY_SUPPORT = uo();
    !f.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
    function uo() {
      try {
        let e = new Uint8Array(1), t = { foo: function() {
          return 42;
        } };
        return Object.setPrototypeOf(t, Uint8Array.prototype), Object.setPrototypeOf(e, t), e.foo() === 42;
      } catch {
        return false;
      }
    }
    Object.defineProperty(f.prototype, "parent", { enumerable: true, get: function() {
      if (!!f.isBuffer(this))
        return this.buffer;
    } });
    Object.defineProperty(f.prototype, "offset", { enumerable: true, get: function() {
      if (!!f.isBuffer(this))
        return this.byteOffset;
    } });
    function X(e) {
      if (e > $e)
        throw new RangeError('The value "' + e + '" is invalid for option "size"');
      let t = new Uint8Array(e);
      return Object.setPrototypeOf(t, f.prototype), t;
    }
    function f(e, t, r) {
      if (typeof e == "number") {
        if (typeof t == "string")
          throw new TypeError('The "string" argument must be of type string. Received type number');
        return At(e);
      }
      return $r(e, t, r);
    }
    f.poolSize = 8192;
    function $r(e, t, r) {
      if (typeof e == "string")
        return ho(e, t);
      if (ArrayBuffer.isView(e))
        return co(e);
      if (e == null)
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
      if (W(e, ArrayBuffer) || e && W(e.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (W(e, SharedArrayBuffer) || e && W(e.buffer, SharedArrayBuffer)))
        return St(e, t, r);
      if (typeof e == "number")
        throw new TypeError('The "value" argument must not be of type number. Received type number');
      let n = e.valueOf && e.valueOf();
      if (n != null && n !== e)
        return f.from(n, t, r);
      let i = po(e);
      if (i)
        return i;
      if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof e[Symbol.toPrimitive] == "function")
        return f.from(e[Symbol.toPrimitive]("string"), t, r);
      throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
    }
    f.from = function(e, t, r) {
      return $r(e, t, r);
    };
    Object.setPrototypeOf(f.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(f, Uint8Array);
    function Gr(e) {
      if (typeof e != "number")
        throw new TypeError('"size" argument must be of type number');
      if (e < 0)
        throw new RangeError('The value "' + e + '" is invalid for option "size"');
    }
    function lo(e, t, r) {
      return Gr(e), e <= 0 ? X(e) : t !== undefined ? typeof r == "string" ? X(e).fill(t, r) : X(e).fill(t) : X(e);
    }
    f.alloc = function(e, t, r) {
      return lo(e, t, r);
    };
    function At(e) {
      return Gr(e), X(e < 0 ? 0 : Bt(e) | 0);
    }
    f.allocUnsafe = function(e) {
      return At(e);
    };
    f.allocUnsafeSlow = function(e) {
      return At(e);
    };
    function ho(e, t) {
      if ((typeof t != "string" || t === "") && (t = "utf8"), !f.isEncoding(t))
        throw new TypeError("Unknown encoding: " + t);
      let r = Kr(e, t) | 0, n = X(r), i = n.write(e, t);
      return i !== r && (n = n.slice(0, i)), n;
    }
    function Rt(e) {
      let t = e.length < 0 ? 0 : Bt(e.length) | 0, r = X(t);
      for (let n = 0;n < t; n += 1)
        r[n] = e[n] & 255;
      return r;
    }
    function co(e) {
      if (W(e, Uint8Array)) {
        let t = new Uint8Array(e);
        return St(t.buffer, t.byteOffset, t.byteLength);
      }
      return Rt(e);
    }
    function St(e, t, r) {
      if (t < 0 || e.byteLength < t)
        throw new RangeError('"offset" is outside of buffer bounds');
      if (e.byteLength < t + (r || 0))
        throw new RangeError('"length" is outside of buffer bounds');
      let n;
      return t === undefined && r === undefined ? n = new Uint8Array(e) : r === undefined ? n = new Uint8Array(e, t) : n = new Uint8Array(e, t, r), Object.setPrototypeOf(n, f.prototype), n;
    }
    function po(e) {
      if (f.isBuffer(e)) {
        let t = Bt(e.length) | 0, r = X(t);
        return r.length === 0 || e.copy(r, 0, 0, t), r;
      }
      if (e.length !== undefined)
        return typeof e.length != "number" || It(e.length) ? X(0) : Rt(e);
      if (e.type === "Buffer" && Array.isArray(e.data))
        return Rt(e.data);
    }
    function Bt(e) {
      if (e >= $e)
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + $e.toString(16) + " bytes");
      return e | 0;
    }
    function yo(e) {
      return +e != e && (e = 0), f.alloc(+e);
    }
    f.isBuffer = function(t) {
      return t != null && t._isBuffer === true && t !== f.prototype;
    };
    f.compare = function(t, r) {
      if (W(t, Uint8Array) && (t = f.from(t, t.offset, t.byteLength)), W(r, Uint8Array) && (r = f.from(r, r.offset, r.byteLength)), !f.isBuffer(t) || !f.isBuffer(r))
        throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
      if (t === r)
        return 0;
      let n = t.length, i = r.length;
      for (let o = 0, a = Math.min(n, i);o < a; ++o)
        if (t[o] !== r[o]) {
          n = t[o], i = r[o];
          break;
        }
      return n < i ? -1 : i < n ? 1 : 0;
    };
    f.isEncoding = function(t) {
      switch (String(t).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };
    f.concat = function(t, r) {
      if (!Array.isArray(t))
        throw new TypeError('"list" argument must be an Array of Buffers');
      if (t.length === 0)
        return f.alloc(0);
      let n;
      if (r === undefined)
        for (r = 0, n = 0;n < t.length; ++n)
          r += t[n].length;
      let i = f.allocUnsafe(r), o = 0;
      for (n = 0;n < t.length; ++n) {
        let a = t[n];
        if (W(a, Uint8Array))
          o + a.length > i.length ? (f.isBuffer(a) || (a = f.from(a)), a.copy(i, o)) : Uint8Array.prototype.set.call(i, a, o);
        else if (f.isBuffer(a))
          a.copy(i, o);
        else
          throw new TypeError('"list" argument must be an Array of Buffers');
        o += a.length;
      }
      return i;
    };
    function Kr(e, t) {
      if (f.isBuffer(e))
        return e.length;
      if (ArrayBuffer.isView(e) || W(e, ArrayBuffer))
        return e.byteLength;
      if (typeof e != "string")
        throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof e);
      let r = e.length, n = arguments.length > 2 && arguments[2] === true;
      if (!n && r === 0)
        return 0;
      let i = false;
      for (;; )
        switch (t) {
          case "ascii":
          case "latin1":
          case "binary":
            return r;
          case "utf8":
          case "utf-8":
            return Tt(e).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return r * 2;
          case "hex":
            return r >>> 1;
          case "base64":
            return tn(e).length;
          default:
            if (i)
              return n ? -1 : Tt(e).length;
            t = ("" + t).toLowerCase(), i = true;
        }
    }
    f.byteLength = Kr;
    function go(e, t, r) {
      let n = false;
      if ((t === undefined || t < 0) && (t = 0), t > this.length || ((r === undefined || r > this.length) && (r = this.length), r <= 0) || (r >>>= 0, t >>>= 0, r <= t))
        return "";
      for (e || (e = "utf8");; )
        switch (e) {
          case "hex":
            return To(this, t, r);
          case "utf8":
          case "utf-8":
            return Yr(this, t, r);
          case "ascii":
            return Ro(this, t, r);
          case "latin1":
          case "binary":
            return So(this, t, r);
          case "base64":
            return Eo(this, t, r);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return Ao(this, t, r);
          default:
            if (n)
              throw new TypeError("Unknown encoding: " + e);
            e = (e + "").toLowerCase(), n = true;
        }
    }
    f.prototype._isBuffer = true;
    function se(e, t, r) {
      let n = e[t];
      e[t] = e[r], e[r] = n;
    }
    f.prototype.swap16 = function() {
      let t = this.length;
      if (t % 2 !== 0)
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      for (let r = 0;r < t; r += 2)
        se(this, r, r + 1);
      return this;
    };
    f.prototype.swap32 = function() {
      let t = this.length;
      if (t % 4 !== 0)
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      for (let r = 0;r < t; r += 4)
        se(this, r, r + 3), se(this, r + 1, r + 2);
      return this;
    };
    f.prototype.swap64 = function() {
      let t = this.length;
      if (t % 8 !== 0)
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      for (let r = 0;r < t; r += 8)
        se(this, r, r + 7), se(this, r + 1, r + 6), se(this, r + 2, r + 5), se(this, r + 3, r + 4);
      return this;
    };
    f.prototype.toString = function() {
      let t = this.length;
      return t === 0 ? "" : arguments.length === 0 ? Yr(this, 0, t) : go.apply(this, arguments);
    };
    f.prototype.toLocaleString = f.prototype.toString;
    f.prototype.equals = function(t) {
      if (!f.isBuffer(t))
        throw new TypeError("Argument must be a Buffer");
      return this === t ? true : f.compare(this, t) === 0;
    };
    f.prototype.inspect = function() {
      let t = "", r = be.INSPECT_MAX_BYTES;
      return t = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (t += " ... "), "<Buffer " + t + ">";
    };
    kr && (f.prototype[kr] = f.prototype.inspect);
    f.prototype.compare = function(t, r, n, i, o) {
      if (W(t, Uint8Array) && (t = f.from(t, t.offset, t.byteLength)), !f.isBuffer(t))
        throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t);
      if (r === undefined && (r = 0), n === undefined && (n = t ? t.length : 0), i === undefined && (i = 0), o === undefined && (o = this.length), r < 0 || n > t.length || i < 0 || o > this.length)
        throw new RangeError("out of range index");
      if (i >= o && r >= n)
        return 0;
      if (i >= o)
        return -1;
      if (r >= n)
        return 1;
      if (r >>>= 0, n >>>= 0, i >>>= 0, o >>>= 0, this === t)
        return 0;
      let a = o - i, s = n - r, u = Math.min(a, s), l = this.slice(i, o), h2 = t.slice(r, n);
      for (let c = 0;c < u; ++c)
        if (l[c] !== h2[c]) {
          a = l[c], s = h2[c];
          break;
        }
      return a < s ? -1 : s < a ? 1 : 0;
    };
    function Vr(e, t, r, n, i) {
      if (e.length === 0)
        return -1;
      if (typeof r == "string" ? (n = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), r = +r, It(r) && (r = i ? 0 : e.length - 1), r < 0 && (r = e.length + r), r >= e.length) {
        if (i)
          return -1;
        r = e.length - 1;
      } else if (r < 0)
        if (i)
          r = 0;
        else
          return -1;
      if (typeof t == "string" && (t = f.from(t, n)), f.isBuffer(t))
        return t.length === 0 ? -1 : jr(e, t, r, n, i);
      if (typeof t == "number")
        return t = t & 255, typeof Uint8Array.prototype.indexOf == "function" ? i ? Uint8Array.prototype.indexOf.call(e, t, r) : Uint8Array.prototype.lastIndexOf.call(e, t, r) : jr(e, [t], r, n, i);
      throw new TypeError("val must be string, number or Buffer");
    }
    function jr(e, t, r, n, i) {
      let o = 1, a = e.length, s = t.length;
      if (n !== undefined && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
        if (e.length < 2 || t.length < 2)
          return -1;
        o = 2, a /= 2, s /= 2, r /= 2;
      }
      function u(h2, c) {
        return o === 1 ? h2[c] : h2.readUInt16BE(c * o);
      }
      let l;
      if (i) {
        let h2 = -1;
        for (l = r;l < a; l++)
          if (u(e, l) === u(t, h2 === -1 ? 0 : l - h2)) {
            if (h2 === -1 && (h2 = l), l - h2 + 1 === s)
              return h2 * o;
          } else
            h2 !== -1 && (l -= l - h2), h2 = -1;
      } else
        for (r + s > a && (r = a - s), l = r;l >= 0; l--) {
          let h2 = true;
          for (let c = 0;c < s; c++)
            if (u(e, l + c) !== u(t, c)) {
              h2 = false;
              break;
            }
          if (h2)
            return l;
        }
      return -1;
    }
    f.prototype.includes = function(t, r, n) {
      return this.indexOf(t, r, n) !== -1;
    };
    f.prototype.indexOf = function(t, r, n) {
      return Vr(this, t, r, n, true);
    };
    f.prototype.lastIndexOf = function(t, r, n) {
      return Vr(this, t, r, n, false);
    };
    function wo(e, t, r, n) {
      r = Number(r) || 0;
      let i = e.length - r;
      n ? (n = Number(n), n > i && (n = i)) : n = i;
      let o = t.length;
      n > o / 2 && (n = o / 2);
      let a;
      for (a = 0;a < n; ++a) {
        let s = parseInt(t.substr(a * 2, 2), 16);
        if (It(s))
          return a;
        e[r + a] = s;
      }
      return a;
    }
    function mo(e, t, r, n) {
      return Ge(Tt(t, e.length - r), e, r, n);
    }
    function bo(e, t, r, n) {
      return Ge(Lo(t), e, r, n);
    }
    function _o(e, t, r, n) {
      return Ge(tn(t), e, r, n);
    }
    function vo(e, t, r, n) {
      return Ge(Mo(t, e.length - r), e, r, n);
    }
    f.prototype.write = function(t, r, n, i) {
      if (r === undefined)
        i = "utf8", n = this.length, r = 0;
      else if (n === undefined && typeof r == "string")
        i = r, n = this.length, r = 0;
      else if (isFinite(r))
        r = r >>> 0, isFinite(n) ? (n = n >>> 0, i === undefined && (i = "utf8")) : (i = n, n = undefined);
      else
        throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
      let o = this.length - r;
      if ((n === undefined || n > o) && (n = o), t.length > 0 && (n < 0 || r < 0) || r > this.length)
        throw new RangeError("Attempt to write outside buffer bounds");
      i || (i = "utf8");
      let a = false;
      for (;; )
        switch (i) {
          case "hex":
            return wo(this, t, r, n);
          case "utf8":
          case "utf-8":
            return mo(this, t, r, n);
          case "ascii":
          case "latin1":
          case "binary":
            return bo(this, t, r, n);
          case "base64":
            return _o(this, t, r, n);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return vo(this, t, r, n);
          default:
            if (a)
              throw new TypeError("Unknown encoding: " + i);
            i = ("" + i).toLowerCase(), a = true;
        }
    };
    f.prototype.toJSON = function() {
      return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
    };
    function Eo(e, t, r) {
      return t === 0 && r === e.length ? xt.fromByteArray(e) : xt.fromByteArray(e.slice(t, r));
    }
    function Yr(e, t, r) {
      r = Math.min(e.length, r);
      let n = [], i = t;
      for (;i < r; ) {
        let o = e[i], a = null, s = o > 239 ? 4 : o > 223 ? 3 : o > 191 ? 2 : 1;
        if (i + s <= r) {
          let u, l, h2, c;
          switch (s) {
            case 1:
              o < 128 && (a = o);
              break;
            case 2:
              u = e[i + 1], (u & 192) === 128 && (c = (o & 31) << 6 | u & 63, c > 127 && (a = c));
              break;
            case 3:
              u = e[i + 1], l = e[i + 2], (u & 192) === 128 && (l & 192) === 128 && (c = (o & 15) << 12 | (u & 63) << 6 | l & 63, c > 2047 && (c < 55296 || c > 57343) && (a = c));
              break;
            case 4:
              u = e[i + 1], l = e[i + 2], h2 = e[i + 3], (u & 192) === 128 && (l & 192) === 128 && (h2 & 192) === 128 && (c = (o & 15) << 18 | (u & 63) << 12 | (l & 63) << 6 | h2 & 63, c > 65535 && c < 1114112 && (a = c));
          }
        }
        a === null ? (a = 65533, s = 1) : a > 65535 && (a -= 65536, n.push(a >>> 10 & 1023 | 55296), a = 56320 | a & 1023), n.push(a), i += s;
      }
      return xo(n);
    }
    var Hr = 4096;
    function xo(e) {
      let t = e.length;
      if (t <= Hr)
        return String.fromCharCode.apply(String, e);
      let r = "", n = 0;
      for (;n < t; )
        r += String.fromCharCode.apply(String, e.slice(n, n += Hr));
      return r;
    }
    function Ro(e, t, r) {
      let n = "";
      r = Math.min(e.length, r);
      for (let i = t;i < r; ++i)
        n += String.fromCharCode(e[i] & 127);
      return n;
    }
    function So(e, t, r) {
      let n = "";
      r = Math.min(e.length, r);
      for (let i = t;i < r; ++i)
        n += String.fromCharCode(e[i]);
      return n;
    }
    function To(e, t, r) {
      let n = e.length;
      (!t || t < 0) && (t = 0), (!r || r < 0 || r > n) && (r = n);
      let i = "";
      for (let o = t;o < r; ++o)
        i += Oo[e[o]];
      return i;
    }
    function Ao(e, t, r) {
      let n = e.slice(t, r), i = "";
      for (let o = 0;o < n.length - 1; o += 2)
        i += String.fromCharCode(n[o] + n[o + 1] * 256);
      return i;
    }
    f.prototype.slice = function(t, r) {
      let n = this.length;
      t = ~~t, r = r === undefined ? n : ~~r, t < 0 ? (t += n, t < 0 && (t = 0)) : t > n && (t = n), r < 0 ? (r += n, r < 0 && (r = 0)) : r > n && (r = n), r < t && (r = t);
      let i = this.subarray(t, r);
      return Object.setPrototypeOf(i, f.prototype), i;
    };
    function C2(e, t, r) {
      if (e % 1 !== 0 || e < 0)
        throw new RangeError("offset is not uint");
      if (e + t > r)
        throw new RangeError("Trying to access beyond buffer length");
    }
    f.prototype.readUintLE = f.prototype.readUIntLE = function(t, r, n) {
      t = t >>> 0, r = r >>> 0, n || C2(t, r, this.length);
      let i = this[t], o = 1, a = 0;
      for (;++a < r && (o *= 256); )
        i += this[t + a] * o;
      return i;
    };
    f.prototype.readUintBE = f.prototype.readUIntBE = function(t, r, n) {
      t = t >>> 0, r = r >>> 0, n || C2(t, r, this.length);
      let i = this[t + --r], o = 1;
      for (;r > 0 && (o *= 256); )
        i += this[t + --r] * o;
      return i;
    };
    f.prototype.readUint8 = f.prototype.readUInt8 = function(t, r) {
      return t = t >>> 0, r || C2(t, 1, this.length), this[t];
    };
    f.prototype.readUint16LE = f.prototype.readUInt16LE = function(t, r) {
      return t = t >>> 0, r || C2(t, 2, this.length), this[t] | this[t + 1] << 8;
    };
    f.prototype.readUint16BE = f.prototype.readUInt16BE = function(t, r) {
      return t = t >>> 0, r || C2(t, 2, this.length), this[t] << 8 | this[t + 1];
    };
    f.prototype.readUint32LE = f.prototype.readUInt32LE = function(t, r) {
      return t = t >>> 0, r || C2(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + this[t + 3] * 16777216;
    };
    f.prototype.readUint32BE = f.prototype.readUInt32BE = function(t, r) {
      return t = t >>> 0, r || C2(t, 4, this.length), this[t] * 16777216 + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]);
    };
    f.prototype.readBigUInt64LE = ee(function(t) {
      t = t >>> 0, me(t, "offset");
      let r = this[t], n = this[t + 7];
      (r === undefined || n === undefined) && Ie(t, this.length - 8);
      let i = r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24, o = this[++t] + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + n * 2 ** 24;
      return BigInt(i) + (BigInt(o) << BigInt(32));
    });
    f.prototype.readBigUInt64BE = ee(function(t) {
      t = t >>> 0, me(t, "offset");
      let r = this[t], n = this[t + 7];
      (r === undefined || n === undefined) && Ie(t, this.length - 8);
      let i = r * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t], o = this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + n;
      return (BigInt(i) << BigInt(32)) + BigInt(o);
    });
    f.prototype.readIntLE = function(t, r, n) {
      t = t >>> 0, r = r >>> 0, n || C2(t, r, this.length);
      let i = this[t], o = 1, a = 0;
      for (;++a < r && (o *= 256); )
        i += this[t + a] * o;
      return o *= 128, i >= o && (i -= Math.pow(2, 8 * r)), i;
    };
    f.prototype.readIntBE = function(t, r, n) {
      t = t >>> 0, r = r >>> 0, n || C2(t, r, this.length);
      let i = r, o = 1, a = this[t + --i];
      for (;i > 0 && (o *= 256); )
        a += this[t + --i] * o;
      return o *= 128, a >= o && (a -= Math.pow(2, 8 * r)), a;
    };
    f.prototype.readInt8 = function(t, r) {
      return t = t >>> 0, r || C2(t, 1, this.length), this[t] & 128 ? (255 - this[t] + 1) * -1 : this[t];
    };
    f.prototype.readInt16LE = function(t, r) {
      t = t >>> 0, r || C2(t, 2, this.length);
      let n = this[t] | this[t + 1] << 8;
      return n & 32768 ? n | 4294901760 : n;
    };
    f.prototype.readInt16BE = function(t, r) {
      t = t >>> 0, r || C2(t, 2, this.length);
      let n = this[t + 1] | this[t] << 8;
      return n & 32768 ? n | 4294901760 : n;
    };
    f.prototype.readInt32LE = function(t, r) {
      return t = t >>> 0, r || C2(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24;
    };
    f.prototype.readInt32BE = function(t, r) {
      return t = t >>> 0, r || C2(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3];
    };
    f.prototype.readBigInt64LE = ee(function(t) {
      t = t >>> 0, me(t, "offset");
      let r = this[t], n = this[t + 7];
      (r === undefined || n === undefined) && Ie(t, this.length - 8);
      let i = this[t + 4] + this[t + 5] * 2 ** 8 + this[t + 6] * 2 ** 16 + (n << 24);
      return (BigInt(i) << BigInt(32)) + BigInt(r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24);
    });
    f.prototype.readBigInt64BE = ee(function(t) {
      t = t >>> 0, me(t, "offset");
      let r = this[t], n = this[t + 7];
      (r === undefined || n === undefined) && Ie(t, this.length - 8);
      let i = (r << 24) + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t];
      return (BigInt(i) << BigInt(32)) + BigInt(this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + n);
    });
    f.prototype.readFloatLE = function(t, r) {
      return t = t >>> 0, r || C2(t, 4, this.length), we.read(this, t, true, 23, 4);
    };
    f.prototype.readFloatBE = function(t, r) {
      return t = t >>> 0, r || C2(t, 4, this.length), we.read(this, t, false, 23, 4);
    };
    f.prototype.readDoubleLE = function(t, r) {
      return t = t >>> 0, r || C2(t, 8, this.length), we.read(this, t, true, 52, 8);
    };
    f.prototype.readDoubleBE = function(t, r) {
      return t = t >>> 0, r || C2(t, 8, this.length), we.read(this, t, false, 52, 8);
    };
    function O(e, t, r, n, i, o) {
      if (!f.isBuffer(e))
        throw new TypeError('"buffer" argument must be a Buffer instance');
      if (t > i || t < o)
        throw new RangeError('"value" argument is out of bounds');
      if (r + n > e.length)
        throw new RangeError("Index out of range");
    }
    f.prototype.writeUintLE = f.prototype.writeUIntLE = function(t, r, n, i) {
      if (t = +t, r = r >>> 0, n = n >>> 0, !i) {
        let s = Math.pow(2, 8 * n) - 1;
        O(this, t, r, n, s, 0);
      }
      let o = 1, a = 0;
      for (this[r] = t & 255;++a < n && (o *= 256); )
        this[r + a] = t / o & 255;
      return r + n;
    };
    f.prototype.writeUintBE = f.prototype.writeUIntBE = function(t, r, n, i) {
      if (t = +t, r = r >>> 0, n = n >>> 0, !i) {
        let s = Math.pow(2, 8 * n) - 1;
        O(this, t, r, n, s, 0);
      }
      let o = n - 1, a = 1;
      for (this[r + o] = t & 255;--o >= 0 && (a *= 256); )
        this[r + o] = t / a & 255;
      return r + n;
    };
    f.prototype.writeUint8 = f.prototype.writeUInt8 = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 1, 255, 0), this[r] = t & 255, r + 1;
    };
    f.prototype.writeUint16LE = f.prototype.writeUInt16LE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 2, 65535, 0), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
    };
    f.prototype.writeUint16BE = f.prototype.writeUInt16BE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 2, 65535, 0), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
    };
    f.prototype.writeUint32LE = f.prototype.writeUInt32LE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 4, 4294967295, 0), this[r + 3] = t >>> 24, this[r + 2] = t >>> 16, this[r + 1] = t >>> 8, this[r] = t & 255, r + 4;
    };
    f.prototype.writeUint32BE = f.prototype.writeUInt32BE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 4, 4294967295, 0), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
    };
    function Xr(e, t, r, n, i) {
      en(t, n, i, e, r, 7);
      let o = Number(t & BigInt(4294967295));
      e[r++] = o, o = o >> 8, e[r++] = o, o = o >> 8, e[r++] = o, o = o >> 8, e[r++] = o;
      let a = Number(t >> BigInt(32) & BigInt(4294967295));
      return e[r++] = a, a = a >> 8, e[r++] = a, a = a >> 8, e[r++] = a, a = a >> 8, e[r++] = a, r;
    }
    function zr(e, t, r, n, i) {
      en(t, n, i, e, r, 7);
      let o = Number(t & BigInt(4294967295));
      e[r + 7] = o, o = o >> 8, e[r + 6] = o, o = o >> 8, e[r + 5] = o, o = o >> 8, e[r + 4] = o;
      let a = Number(t >> BigInt(32) & BigInt(4294967295));
      return e[r + 3] = a, a = a >> 8, e[r + 2] = a, a = a >> 8, e[r + 1] = a, a = a >> 8, e[r] = a, r + 8;
    }
    f.prototype.writeBigUInt64LE = ee(function(t, r = 0) {
      return Xr(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    f.prototype.writeBigUInt64BE = ee(function(t, r = 0) {
      return zr(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    f.prototype.writeIntLE = function(t, r, n, i) {
      if (t = +t, r = r >>> 0, !i) {
        let u = Math.pow(2, 8 * n - 1);
        O(this, t, r, n, u - 1, -u);
      }
      let o = 0, a = 1, s = 0;
      for (this[r] = t & 255;++o < n && (a *= 256); )
        t < 0 && s === 0 && this[r + o - 1] !== 0 && (s = 1), this[r + o] = (t / a >> 0) - s & 255;
      return r + n;
    };
    f.prototype.writeIntBE = function(t, r, n, i) {
      if (t = +t, r = r >>> 0, !i) {
        let u = Math.pow(2, 8 * n - 1);
        O(this, t, r, n, u - 1, -u);
      }
      let o = n - 1, a = 1, s = 0;
      for (this[r + o] = t & 255;--o >= 0 && (a *= 256); )
        t < 0 && s === 0 && this[r + o + 1] !== 0 && (s = 1), this[r + o] = (t / a >> 0) - s & 255;
      return r + n;
    };
    f.prototype.writeInt8 = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 1, 127, -128), t < 0 && (t = 255 + t + 1), this[r] = t & 255, r + 1;
    };
    f.prototype.writeInt16LE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 2, 32767, -32768), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
    };
    f.prototype.writeInt16BE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 2, 32767, -32768), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
    };
    f.prototype.writeInt32LE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 4, 2147483647, -2147483648), this[r] = t & 255, this[r + 1] = t >>> 8, this[r + 2] = t >>> 16, this[r + 3] = t >>> 24, r + 4;
    };
    f.prototype.writeInt32BE = function(t, r, n) {
      return t = +t, r = r >>> 0, n || O(this, t, r, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
    };
    f.prototype.writeBigInt64LE = ee(function(t, r = 0) {
      return Xr(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    f.prototype.writeBigInt64BE = ee(function(t, r = 0) {
      return zr(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function Zr(e, t, r, n, i, o) {
      if (r + n > e.length)
        throw new RangeError("Index out of range");
      if (r < 0)
        throw new RangeError("Index out of range");
    }
    function Jr(e, t, r, n, i) {
      return t = +t, r = r >>> 0, i || Zr(e, t, r, 4, 340282346638528860000000000000000000000, -340282346638528860000000000000000000000), we.write(e, t, r, n, 23, 4), r + 4;
    }
    f.prototype.writeFloatLE = function(t, r, n) {
      return Jr(this, t, r, true, n);
    };
    f.prototype.writeFloatBE = function(t, r, n) {
      return Jr(this, t, r, false, n);
    };
    function Qr(e, t, r, n, i) {
      return t = +t, r = r >>> 0, i || Zr(e, t, r, 8, 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000), we.write(e, t, r, n, 52, 8), r + 8;
    }
    f.prototype.writeDoubleLE = function(t, r, n) {
      return Qr(this, t, r, true, n);
    };
    f.prototype.writeDoubleBE = function(t, r, n) {
      return Qr(this, t, r, false, n);
    };
    f.prototype.copy = function(t, r, n, i) {
      if (!f.isBuffer(t))
        throw new TypeError("argument should be a Buffer");
      if (n || (n = 0), !i && i !== 0 && (i = this.length), r >= t.length && (r = t.length), r || (r = 0), i > 0 && i < n && (i = n), i === n || t.length === 0 || this.length === 0)
        return 0;
      if (r < 0)
        throw new RangeError("targetStart out of bounds");
      if (n < 0 || n >= this.length)
        throw new RangeError("Index out of range");
      if (i < 0)
        throw new RangeError("sourceEnd out of bounds");
      i > this.length && (i = this.length), t.length - r < i - n && (i = t.length - r + n);
      let o = i - n;
      return this === t && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(r, n, i) : Uint8Array.prototype.set.call(t, this.subarray(n, i), r), o;
    };
    f.prototype.fill = function(t, r, n, i) {
      if (typeof t == "string") {
        if (typeof r == "string" ? (i = r, r = 0, n = this.length) : typeof n == "string" && (i = n, n = this.length), i !== undefined && typeof i != "string")
          throw new TypeError("encoding must be a string");
        if (typeof i == "string" && !f.isEncoding(i))
          throw new TypeError("Unknown encoding: " + i);
        if (t.length === 1) {
          let a = t.charCodeAt(0);
          (i === "utf8" && a < 128 || i === "latin1") && (t = a);
        }
      } else
        typeof t == "number" ? t = t & 255 : typeof t == "boolean" && (t = Number(t));
      if (r < 0 || this.length < r || this.length < n)
        throw new RangeError("Out of range index");
      if (n <= r)
        return this;
      r = r >>> 0, n = n === undefined ? this.length : n >>> 0, t || (t = 0);
      let o;
      if (typeof t == "number")
        for (o = r;o < n; ++o)
          this[o] = t;
      else {
        let a = f.isBuffer(t) ? t : f.from(t, i), s = a.length;
        if (s === 0)
          throw new TypeError('The value "' + t + '" is invalid for argument "value"');
        for (o = 0;o < n - r; ++o)
          this[o + r] = a[o % s];
      }
      return this;
    };
    var ge = {};
    function Ct(e, t, r) {
      ge[e] = class extends r {
        constructor() {
          super(), Object.defineProperty(this, "message", { value: t.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${e}]`, this.stack, delete this.name;
        }
        get code() {
          return e;
        }
        set code(i) {
          Object.defineProperty(this, "code", { configurable: true, enumerable: true, value: i, writable: true });
        }
        toString() {
          return `${this.name} [${e}]: ${this.message}`;
        }
      };
    }
    Ct("ERR_BUFFER_OUT_OF_BOUNDS", function(e) {
      return e ? `${e} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
    }, RangeError);
    Ct("ERR_INVALID_ARG_TYPE", function(e, t) {
      return `The "${e}" argument must be of type number. Received type ${typeof t}`;
    }, TypeError);
    Ct("ERR_OUT_OF_RANGE", function(e, t, r) {
      let n = `The value of "${e}" is out of range.`, i = r;
      return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? i = Wr(String(r)) : typeof r == "bigint" && (i = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (i = Wr(i)), i += "n"), n += ` It must be ${t}. Received ${i}`, n;
    }, RangeError);
    function Wr(e) {
      let t = "", r = e.length, n = e[0] === "-" ? 1 : 0;
      for (;r >= n + 4; r -= 3)
        t = `_${e.slice(r - 3, r)}${t}`;
      return `${e.slice(0, r)}${t}`;
    }
    function Bo(e, t, r) {
      me(t, "offset"), (e[t] === undefined || e[t + r] === undefined) && Ie(t, e.length - (r + 1));
    }
    function en(e, t, r, n, i, o) {
      if (e > r || e < t) {
        let a = typeof t == "bigint" ? "n" : "", s;
        throw o > 3 ? t === 0 || t === BigInt(0) ? s = `>= 0${a} and < 2${a} ** ${(o + 1) * 8}${a}` : s = `>= -(2${a} ** ${(o + 1) * 8 - 1}${a}) and < 2 ** ${(o + 1) * 8 - 1}${a}` : s = `>= ${t}${a} and <= ${r}${a}`, new ge.ERR_OUT_OF_RANGE("value", s, e);
      }
      Bo(n, i, o);
    }
    function me(e, t) {
      if (typeof e != "number")
        throw new ge.ERR_INVALID_ARG_TYPE(t, "number", e);
    }
    function Ie(e, t, r) {
      throw Math.floor(e) !== e ? (me(e, r), new ge.ERR_OUT_OF_RANGE(r || "offset", "an integer", e)) : t < 0 ? new ge.ERR_BUFFER_OUT_OF_BOUNDS : new ge.ERR_OUT_OF_RANGE(r || "offset", `>= ${r ? 1 : 0} and <= ${t}`, e);
    }
    var Co = /[^+/0-9A-Za-z-_]/g;
    function Io(e) {
      if (e = e.split("=")[0], e = e.trim().replace(Co, ""), e.length < 2)
        return "";
      for (;e.length % 4 !== 0; )
        e = e + "=";
      return e;
    }
    function Tt(e, t) {
      t = t || 1 / 0;
      let r, n = e.length, i = null, o = [];
      for (let a = 0;a < n; ++a) {
        if (r = e.charCodeAt(a), r > 55295 && r < 57344) {
          if (!i) {
            if (r > 56319) {
              (t -= 3) > -1 && o.push(239, 191, 189);
              continue;
            } else if (a + 1 === n) {
              (t -= 3) > -1 && o.push(239, 191, 189);
              continue;
            }
            i = r;
            continue;
          }
          if (r < 56320) {
            (t -= 3) > -1 && o.push(239, 191, 189), i = r;
            continue;
          }
          r = (i - 55296 << 10 | r - 56320) + 65536;
        } else
          i && (t -= 3) > -1 && o.push(239, 191, 189);
        if (i = null, r < 128) {
          if ((t -= 1) < 0)
            break;
          o.push(r);
        } else if (r < 2048) {
          if ((t -= 2) < 0)
            break;
          o.push(r >> 6 | 192, r & 63 | 128);
        } else if (r < 65536) {
          if ((t -= 3) < 0)
            break;
          o.push(r >> 12 | 224, r >> 6 & 63 | 128, r & 63 | 128);
        } else if (r < 1114112) {
          if ((t -= 4) < 0)
            break;
          o.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, r & 63 | 128);
        } else
          throw new Error("Invalid code point");
      }
      return o;
    }
    function Lo(e) {
      let t = [];
      for (let r = 0;r < e.length; ++r)
        t.push(e.charCodeAt(r) & 255);
      return t;
    }
    function Mo(e, t) {
      let r, n, i, o = [];
      for (let a = 0;a < e.length && !((t -= 2) < 0); ++a)
        r = e.charCodeAt(a), n = r >> 8, i = r % 256, o.push(i), o.push(n);
      return o;
    }
    function tn(e) {
      return xt.toByteArray(Io(e));
    }
    function Ge(e, t, r, n) {
      let i;
      for (i = 0;i < n && !(i + r >= t.length || i >= e.length); ++i)
        t[i + r] = e[i];
      return i;
    }
    function W(e, t) {
      return e instanceof t || e != null && e.constructor != null && e.constructor.name != null && e.constructor.name === t.name;
    }
    function It(e) {
      return e !== e;
    }
    var Oo = function() {
      let e = "0123456789abcdef", t = new Array(256);
      for (let r = 0;r < 16; ++r) {
        let n = r * 16;
        for (let i = 0;i < 16; ++i)
          t[n + i] = e[r] + e[i];
      }
      return t;
    }();
    function ee(e) {
      return typeof BigInt > "u" ? Fo : e;
    }
    function Fo() {
      throw new Error("BigInt not supported");
    }
  });
  Lt = b2(() => {
  });
  an = b2((Of, on) => {
    function rn(e, t) {
      var r = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(e);
        t && (n = n.filter(function(i) {
          return Object.getOwnPropertyDescriptor(e, i).enumerable;
        })), r.push.apply(r, n);
      }
      return r;
    }
    function No(e) {
      for (var t = 1;t < arguments.length; t++) {
        var r = arguments[t] != null ? arguments[t] : {};
        t % 2 ? rn(Object(r), true).forEach(function(n) {
          Uo(e, n, r[n]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : rn(Object(r)).forEach(function(n) {
          Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
        });
      }
      return e;
    }
    function Uo(e, t, r) {
      return t in e ? Object.defineProperty(e, t, { value: r, enumerable: true, configurable: true, writable: true }) : e[t] = r, e;
    }
    function Po(e, t) {
      if (!(e instanceof t))
        throw new TypeError("Cannot call a class as a function");
    }
    function nn(e, t) {
      for (var r = 0;r < t.length; r++) {
        var n = t[r];
        n.enumerable = n.enumerable || false, n.configurable = true, "value" in n && (n.writable = true), Object.defineProperty(e, n.key, n);
      }
    }
    function qo(e, t, r) {
      return t && nn(e.prototype, t), r && nn(e, r), e;
    }
    var Do = _e(), Ke = Do.Buffer, ko = Lt(), Mt = ko.inspect, jo = Mt && Mt.custom || "inspect";
    function Ho(e, t, r) {
      Ke.prototype.copy.call(e, t, r);
    }
    on.exports = function() {
      function e() {
        Po(this, e), this.head = null, this.tail = null, this.length = 0;
      }
      return qo(e, [{ key: "push", value: function(r) {
        var n = { data: r, next: null };
        this.length > 0 ? this.tail.next = n : this.head = n, this.tail = n, ++this.length;
      } }, { key: "unshift", value: function(r) {
        var n = { data: r, next: this.head };
        this.length === 0 && (this.tail = n), this.head = n, ++this.length;
      } }, { key: "shift", value: function() {
        if (this.length !== 0) {
          var r = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, r;
        }
      } }, { key: "clear", value: function() {
        this.head = this.tail = null, this.length = 0;
      } }, { key: "join", value: function(r) {
        if (this.length === 0)
          return "";
        for (var n = this.head, i = "" + n.data;n = n.next; )
          i += r + n.data;
        return i;
      } }, { key: "concat", value: function(r) {
        if (this.length === 0)
          return Ke.alloc(0);
        for (var n = Ke.allocUnsafe(r >>> 0), i = this.head, o = 0;i; )
          Ho(i.data, n, o), o += i.data.length, i = i.next;
        return n;
      } }, { key: "consume", value: function(r, n) {
        var i;
        return r < this.head.data.length ? (i = this.head.data.slice(0, r), this.head.data = this.head.data.slice(r)) : r === this.head.data.length ? i = this.shift() : i = n ? this._getString(r) : this._getBuffer(r), i;
      } }, { key: "first", value: function() {
        return this.head.data;
      } }, { key: "_getString", value: function(r) {
        var n = this.head, i = 1, o = n.data;
        for (r -= o.length;n = n.next; ) {
          var a = n.data, s = r > a.length ? a.length : r;
          if (s === a.length ? o += a : o += a.slice(0, r), r -= s, r === 0) {
            s === a.length ? (++i, n.next ? this.head = n.next : this.head = this.tail = null) : (this.head = n, n.data = a.slice(s));
            break;
          }
          ++i;
        }
        return this.length -= i, o;
      } }, { key: "_getBuffer", value: function(r) {
        var n = Ke.allocUnsafe(r), i = this.head, o = 1;
        for (i.data.copy(n), r -= i.data.length;i = i.next; ) {
          var a = i.data, s = r > a.length ? a.length : r;
          if (a.copy(n, n.length - r, 0, s), r -= s, r === 0) {
            s === a.length ? (++o, i.next ? this.head = i.next : this.head = this.tail = null) : (this.head = i, i.data = a.slice(s));
            break;
          }
          ++o;
        }
        return this.length -= o, n;
      } }, { key: jo, value: function(r, n) {
        return Mt(this, No({}, n, { depth: 0, customInspect: false }));
      } }]), e;
    }();
  });
  Ft = b2((Ff, fn) => {
    function Wo(e, t) {
      var r = this, n = this._readableState && this._readableState.destroyed, i = this._writableState && this._writableState.destroyed;
      return n || i ? (t ? t(e) : e && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = true, process.nextTick(Ot, this, e)) : process.nextTick(Ot, this, e)), this) : (this._readableState && (this._readableState.destroyed = true), this._writableState && (this._writableState.destroyed = true), this._destroy(e || null, function(o) {
        !t && o ? r._writableState ? r._writableState.errorEmitted ? process.nextTick(Ve, r) : (r._writableState.errorEmitted = true, process.nextTick(sn, r, o)) : process.nextTick(sn, r, o) : t ? (process.nextTick(Ve, r), t(o)) : process.nextTick(Ve, r);
      }), this);
    }
    function sn(e, t) {
      Ot(e, t), Ve(e);
    }
    function Ve(e) {
      e._writableState && !e._writableState.emitClose || e._readableState && !e._readableState.emitClose || e.emit("close");
    }
    function $o() {
      this._readableState && (this._readableState.destroyed = false, this._readableState.reading = false, this._readableState.ended = false, this._readableState.endEmitted = false), this._writableState && (this._writableState.destroyed = false, this._writableState.ended = false, this._writableState.ending = false, this._writableState.finalCalled = false, this._writableState.prefinished = false, this._writableState.finished = false, this._writableState.errorEmitted = false);
    }
    function Ot(e, t) {
      e.emit("error", t);
    }
    function Go(e, t) {
      var { _readableState: r, _writableState: n } = e;
      r && r.autoDestroy || n && n.autoDestroy ? e.destroy(t) : e.emit("error", t);
    }
    fn.exports = { destroy: Wo, undestroy: $o, errorOrDestroy: Go };
  });
  fe = b2((Nf, hn) => {
    function Ko(e, t) {
      e.prototype = Object.create(t.prototype), e.prototype.constructor = e, e.__proto__ = t;
    }
    var ln = {};
    function P(e, t, r) {
      r || (r = Error);
      function n(o, a, s) {
        return typeof t == "string" ? t : t(o, a, s);
      }
      var i = function(o) {
        Ko(a, o);
        function a(s, u, l) {
          return o.call(this, n(s, u, l)) || this;
        }
        return a;
      }(r);
      i.prototype.name = r.name, i.prototype.code = e, ln[e] = i;
    }
    function un(e, t) {
      if (Array.isArray(e)) {
        var r = e.length;
        return e = e.map(function(n) {
          return String(n);
        }), r > 2 ? "one of ".concat(t, " ").concat(e.slice(0, r - 1).join(", "), ", or ") + e[r - 1] : r === 2 ? "one of ".concat(t, " ").concat(e[0], " or ").concat(e[1]) : "of ".concat(t, " ").concat(e[0]);
      } else
        return "of ".concat(t, " ").concat(String(e));
    }
    function Vo(e, t, r) {
      return e.substr(!r || r < 0 ? 0 : +r, t.length) === t;
    }
    function Yo(e, t, r) {
      return (r === undefined || r > e.length) && (r = e.length), e.substring(r - t.length, r) === t;
    }
    function Xo(e, t, r) {
      return typeof r != "number" && (r = 0), r + t.length > e.length ? false : e.indexOf(t, r) !== -1;
    }
    P("ERR_INVALID_OPT_VALUE", function(e, t) {
      return 'The value "' + t + '" is invalid for option "' + e + '"';
    }, TypeError);
    P("ERR_INVALID_ARG_TYPE", function(e, t, r) {
      var n;
      typeof t == "string" && Vo(t, "not ") ? (n = "must not be", t = t.replace(/^not /, "")) : n = "must be";
      var i;
      if (Yo(e, " argument"))
        i = "The ".concat(e, " ").concat(n, " ").concat(un(t, "type"));
      else {
        var o = Xo(e, ".") ? "property" : "argument";
        i = 'The "'.concat(e, '" ').concat(o, " ").concat(n, " ").concat(un(t, "type"));
      }
      return i += ". Received type ".concat(typeof r), i;
    }, TypeError);
    P("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF");
    P("ERR_METHOD_NOT_IMPLEMENTED", function(e) {
      return "The " + e + " method is not implemented";
    });
    P("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
    P("ERR_STREAM_DESTROYED", function(e) {
      return "Cannot call " + e + " after a stream was destroyed";
    });
    P("ERR_MULTIPLE_CALLBACK", "Callback called multiple times");
    P("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable");
    P("ERR_STREAM_WRITE_AFTER_END", "write after end");
    P("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
    P("ERR_UNKNOWN_ENCODING", function(e) {
      return "Unknown encoding: " + e;
    }, TypeError);
    P("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event");
    hn.exports.codes = ln;
  });
  Nt = b2((Uf, cn) => {
    var zo = fe().codes.ERR_INVALID_OPT_VALUE;
    function Zo(e, t, r) {
      return e.highWaterMark != null ? e.highWaterMark : t ? e[r] : null;
    }
    function Jo(e, t, r, n) {
      var i = Zo(t, n, r);
      if (i != null) {
        if (!(isFinite(i) && Math.floor(i) === i) || i < 0) {
          var o = n ? r : "highWaterMark";
          throw new zo(o, i);
        }
        return Math.floor(i);
      }
      return e.objectMode ? 16 : 16 * 1024;
    }
    cn.exports = { getHighWaterMark: Jo };
  });
  pn = b2((Pf, dn) => {
    dn.exports = Qo;
    function Qo(e, t) {
      if (Ut("noDeprecation"))
        return e;
      var r = false;
      function n() {
        if (!r) {
          if (Ut("throwDeprecation"))
            throw new Error(t);
          Ut("traceDeprecation") ? console.trace(t) : console.warn(t), r = true;
        }
        return e.apply(this, arguments);
      }
      return n;
    }
    function Ut(e) {
      try {
        if (!global.localStorage)
          return false;
      } catch {
        return false;
      }
      var t = global.localStorage[e];
      return t == null ? false : String(t).toLowerCase() === "true";
    }
  });
  Dt = b2((qf, _n) => {
    _n.exports = A2;
    function gn(e) {
      var t = this;
      this.next = null, this.entry = null, this.finish = function() {
        Ta(t, e);
      };
    }
    var ve;
    A2.WritableState = Me;
    var ea = { deprecate: pn() }, wn = _t(), Xe = _e().Buffer, ta = global.Uint8Array || function() {
    };
    function ra(e) {
      return Xe.from(e);
    }
    function na(e) {
      return Xe.isBuffer(e) || e instanceof ta;
    }
    var qt = Ft(), ia = Nt(), oa = ia.getHighWaterMark, te = fe().codes, aa = te.ERR_INVALID_ARG_TYPE, sa = te.ERR_METHOD_NOT_IMPLEMENTED, fa = te.ERR_MULTIPLE_CALLBACK, ua = te.ERR_STREAM_CANNOT_PIPE, la = te.ERR_STREAM_DESTROYED, ha = te.ERR_STREAM_NULL_VALUES, ca = te.ERR_STREAM_WRITE_AFTER_END, da = te.ERR_UNKNOWN_ENCODING, Ee = qt.errorOrDestroy;
    Q()(A2, wn);
    function pa() {
    }
    function Me(e, t, r) {
      ve = ve || ue(), e = e || {}, typeof r != "boolean" && (r = t instanceof ve), this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.writableObjectMode), this.highWaterMark = oa(this, e, "writableHighWaterMark", r), this.finalCalled = false, this.needDrain = false, this.ending = false, this.ended = false, this.finished = false, this.destroyed = false;
      var n = e.decodeStrings === false;
      this.decodeStrings = !n, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = false, this.corked = 0, this.sync = true, this.bufferProcessing = false, this.onwrite = function(i) {
        va(t, i);
      }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = false, this.errorEmitted = false, this.emitClose = e.emitClose !== false, this.autoDestroy = !!e.autoDestroy, this.bufferedRequestCount = 0, this.corkedRequestsFree = new gn(this);
    }
    Me.prototype.getBuffer = function() {
      for (var t = this.bufferedRequest, r = [];t; )
        r.push(t), t = t.next;
      return r;
    };
    (function() {
      try {
        Object.defineProperty(Me.prototype, "buffer", { get: ea.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003") });
      } catch {
      }
    })();
    var Ye;
    typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (Ye = Function.prototype[Symbol.hasInstance], Object.defineProperty(A2, Symbol.hasInstance, { value: function(t) {
      return Ye.call(this, t) ? true : this !== A2 ? false : t && t._writableState instanceof Me;
    } })) : Ye = function(t) {
      return t instanceof this;
    };
    function A2(e) {
      ve = ve || ue();
      var t = this instanceof ve;
      if (!t && !Ye.call(A2, this))
        return new A2(e);
      this._writableState = new Me(e, this, t), this.writable = true, e && (typeof e.write == "function" && (this._write = e.write), typeof e.writev == "function" && (this._writev = e.writev), typeof e.destroy == "function" && (this._destroy = e.destroy), typeof e.final == "function" && (this._final = e.final)), wn.call(this);
    }
    A2.prototype.pipe = function() {
      Ee(this, new ua);
    };
    function ya(e, t) {
      var r = new ca;
      Ee(e, r), process.nextTick(t, r);
    }
    function ga(e, t, r, n) {
      var i;
      return r === null ? i = new ha : typeof r != "string" && !t.objectMode && (i = new aa("chunk", ["string", "Buffer"], r)), i ? (Ee(e, i), process.nextTick(n, i), false) : true;
    }
    A2.prototype.write = function(e, t, r) {
      var n = this._writableState, i = false, o = !n.objectMode && na(e);
      return o && !Xe.isBuffer(e) && (e = ra(e)), typeof t == "function" && (r = t, t = null), o ? t = "buffer" : t || (t = n.defaultEncoding), typeof r != "function" && (r = pa), n.ending ? ya(this, r) : (o || ga(this, n, e, r)) && (n.pendingcb++, i = ma(this, n, o, e, t, r)), i;
    };
    A2.prototype.cork = function() {
      this._writableState.corked++;
    };
    A2.prototype.uncork = function() {
      var e = this._writableState;
      e.corked && (e.corked--, !e.writing && !e.corked && !e.bufferProcessing && e.bufferedRequest && mn(this, e));
    };
    A2.prototype.setDefaultEncoding = function(t) {
      if (typeof t == "string" && (t = t.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((t + "").toLowerCase()) > -1))
        throw new da(t);
      return this._writableState.defaultEncoding = t, this;
    };
    Object.defineProperty(A2.prototype, "writableBuffer", { enumerable: false, get: function() {
      return this._writableState && this._writableState.getBuffer();
    } });
    function wa(e, t, r) {
      return !e.objectMode && e.decodeStrings !== false && typeof t == "string" && (t = Xe.from(t, r)), t;
    }
    Object.defineProperty(A2.prototype, "writableHighWaterMark", { enumerable: false, get: function() {
      return this._writableState.highWaterMark;
    } });
    function ma(e, t, r, n, i, o) {
      if (!r) {
        var a = wa(t, n, i);
        n !== a && (r = true, i = "buffer", n = a);
      }
      var s = t.objectMode ? 1 : n.length;
      t.length += s;
      var u = t.length < t.highWaterMark;
      if (u || (t.needDrain = true), t.writing || t.corked) {
        var l = t.lastBufferedRequest;
        t.lastBufferedRequest = { chunk: n, encoding: i, isBuf: r, callback: o, next: null }, l ? l.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest, t.bufferedRequestCount += 1;
      } else
        Pt(e, t, false, s, n, i, o);
      return u;
    }
    function Pt(e, t, r, n, i, o, a) {
      t.writelen = n, t.writecb = a, t.writing = true, t.sync = true, t.destroyed ? t.onwrite(new la("write")) : r ? e._writev(i, t.onwrite) : e._write(i, o, t.onwrite), t.sync = false;
    }
    function ba(e, t, r, n, i) {
      --t.pendingcb, r ? (process.nextTick(i, n), process.nextTick(Le, e, t), e._writableState.errorEmitted = true, Ee(e, n)) : (i(n), e._writableState.errorEmitted = true, Ee(e, n), Le(e, t));
    }
    function _a(e) {
      e.writing = false, e.writecb = null, e.length -= e.writelen, e.writelen = 0;
    }
    function va(e, t) {
      var r = e._writableState, n = r.sync, i = r.writecb;
      if (typeof i != "function")
        throw new fa;
      if (_a(r), t)
        ba(e, r, n, t, i);
      else {
        var o = bn(r) || e.destroyed;
        !o && !r.corked && !r.bufferProcessing && r.bufferedRequest && mn(e, r), n ? process.nextTick(yn, e, r, o, i) : yn(e, r, o, i);
      }
    }
    function yn(e, t, r, n) {
      r || Ea(e, t), t.pendingcb--, n(), Le(e, t);
    }
    function Ea(e, t) {
      t.length === 0 && t.needDrain && (t.needDrain = false, e.emit("drain"));
    }
    function mn(e, t) {
      t.bufferProcessing = true;
      var r = t.bufferedRequest;
      if (e._writev && r && r.next) {
        var n = t.bufferedRequestCount, i = new Array(n), o = t.corkedRequestsFree;
        o.entry = r;
        for (var a = 0, s = true;r; )
          i[a] = r, r.isBuf || (s = false), r = r.next, a += 1;
        i.allBuffers = s, Pt(e, t, true, t.length, i, "", o.finish), t.pendingcb++, t.lastBufferedRequest = null, o.next ? (t.corkedRequestsFree = o.next, o.next = null) : t.corkedRequestsFree = new gn(t), t.bufferedRequestCount = 0;
      } else {
        for (;r; ) {
          var { chunk: u, encoding: l, callback: h2 } = r, c = t.objectMode ? 1 : u.length;
          if (Pt(e, t, false, c, u, l, h2), r = r.next, t.bufferedRequestCount--, t.writing)
            break;
        }
        r === null && (t.lastBufferedRequest = null);
      }
      t.bufferedRequest = r, t.bufferProcessing = false;
    }
    A2.prototype._write = function(e, t, r) {
      r(new sa("_write()"));
    };
    A2.prototype._writev = null;
    A2.prototype.end = function(e, t, r) {
      var n = this._writableState;
      return typeof e == "function" ? (r = e, e = null, t = null) : typeof t == "function" && (r = t, t = null), e != null && this.write(e, t), n.corked && (n.corked = 1, this.uncork()), n.ending || Sa(this, n, r), this;
    };
    Object.defineProperty(A2.prototype, "writableLength", { enumerable: false, get: function() {
      return this._writableState.length;
    } });
    function bn(e) {
      return e.ending && e.length === 0 && e.bufferedRequest === null && !e.finished && !e.writing;
    }
    function xa(e, t) {
      e._final(function(r) {
        t.pendingcb--, r && Ee(e, r), t.prefinished = true, e.emit("prefinish"), Le(e, t);
      });
    }
    function Ra(e, t) {
      !t.prefinished && !t.finalCalled && (typeof e._final == "function" && !t.destroyed ? (t.pendingcb++, t.finalCalled = true, process.nextTick(xa, e, t)) : (t.prefinished = true, e.emit("prefinish")));
    }
    function Le(e, t) {
      var r = bn(t);
      if (r && (Ra(e, t), t.pendingcb === 0 && (t.finished = true, e.emit("finish"), t.autoDestroy))) {
        var n = e._readableState;
        (!n || n.autoDestroy && n.endEmitted) && e.destroy();
      }
      return r;
    }
    function Sa(e, t, r) {
      t.ending = true, Le(e, t), r && (t.finished ? process.nextTick(r) : e.once("finish", r)), t.ended = true, e.writable = false;
    }
    function Ta(e, t, r) {
      var n = e.entry;
      for (e.entry = null;n; ) {
        var i = n.callback;
        t.pendingcb--, i(r), n = n.next;
      }
      t.corkedRequestsFree.next = e;
    }
    Object.defineProperty(A2.prototype, "destroyed", { enumerable: false, get: function() {
      return this._writableState === undefined ? false : this._writableState.destroyed;
    }, set: function(t) {
      !this._writableState || (this._writableState.destroyed = t);
    } });
    A2.prototype.destroy = qt.destroy;
    A2.prototype._undestroy = qt.undestroy;
    A2.prototype._destroy = function(e, t) {
      t(e);
    };
  });
  ue = b2((Df, En) => {
    var Aa = Object.keys || function(e) {
      var t = [];
      for (var r in e)
        t.push(r);
      return t;
    };
    En.exports = $;
    var vn = Ht(), jt = Dt();
    Q()($, vn);
    for (kt = Aa(jt.prototype), ze = 0;ze < kt.length; ze++)
      Ze = kt[ze], $.prototype[Ze] || ($.prototype[Ze] = jt.prototype[Ze]);
    var kt, Ze, ze;
    function $(e) {
      if (!(this instanceof $))
        return new $(e);
      vn.call(this, e), jt.call(this, e), this.allowHalfOpen = true, e && (e.readable === false && (this.readable = false), e.writable === false && (this.writable = false), e.allowHalfOpen === false && (this.allowHalfOpen = false, this.once("end", Ba)));
    }
    Object.defineProperty($.prototype, "writableHighWaterMark", { enumerable: false, get: function() {
      return this._writableState.highWaterMark;
    } });
    Object.defineProperty($.prototype, "writableBuffer", { enumerable: false, get: function() {
      return this._writableState && this._writableState.getBuffer();
    } });
    Object.defineProperty($.prototype, "writableLength", { enumerable: false, get: function() {
      return this._writableState.length;
    } });
    function Ba() {
      this._writableState.ended || process.nextTick(Ca, this);
    }
    function Ca(e) {
      e.end();
    }
    Object.defineProperty($.prototype, "destroyed", { enumerable: false, get: function() {
      return this._readableState === undefined || this._writableState === undefined ? false : this._readableState.destroyed && this._writableState.destroyed;
    }, set: function(t) {
      this._readableState === undefined || this._writableState === undefined || (this._readableState.destroyed = t, this._writableState.destroyed = t);
    } });
  });
  Sn = b2((Wt, Rn) => {
    var Je = _e(), G = Je.Buffer;
    function xn(e, t) {
      for (var r in e)
        t[r] = e[r];
    }
    G.from && G.alloc && G.allocUnsafe && G.allocUnsafeSlow ? Rn.exports = Je : (xn(Je, Wt), Wt.Buffer = le);
    function le(e, t, r) {
      return G(e, t, r);
    }
    le.prototype = Object.create(G.prototype);
    xn(G, le);
    le.from = function(e, t, r) {
      if (typeof e == "number")
        throw new TypeError("Argument must not be a number");
      return G(e, t, r);
    };
    le.alloc = function(e, t, r) {
      if (typeof e != "number")
        throw new TypeError("Argument must be a number");
      var n = G(e);
      return t !== undefined ? typeof r == "string" ? n.fill(t, r) : n.fill(t) : n.fill(0), n;
    };
    le.allocUnsafe = function(e) {
      if (typeof e != "number")
        throw new TypeError("Argument must be a number");
      return G(e);
    };
    le.allocUnsafeSlow = function(e) {
      if (typeof e != "number")
        throw new TypeError("Argument must be a number");
      return Je.SlowBuffer(e);
    };
  });
  Bn = b2((An) => {
    var Gt = Sn().Buffer, Tn = Gt.isEncoding || function(e) {
      switch (e = "" + e, e && e.toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
        case "raw":
          return true;
        default:
          return false;
      }
    };
    function Ia(e) {
      if (!e)
        return "utf8";
      for (var t;; )
        switch (e) {
          case "utf8":
          case "utf-8":
            return "utf8";
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return "utf16le";
          case "latin1":
          case "binary":
            return "latin1";
          case "base64":
          case "ascii":
          case "hex":
            return e;
          default:
            if (t)
              return;
            e = ("" + e).toLowerCase(), t = true;
        }
    }
    function La(e) {
      var t = Ia(e);
      if (typeof t != "string" && (Gt.isEncoding === Tn || !Tn(e)))
        throw new Error("Unknown encoding: " + e);
      return t || e;
    }
    An.StringDecoder = Oe;
    function Oe(e) {
      this.encoding = La(e);
      var t;
      switch (this.encoding) {
        case "utf16le":
          this.text = Pa, this.end = qa, t = 4;
          break;
        case "utf8":
          this.fillLast = Fa, t = 4;
          break;
        case "base64":
          this.text = Da, this.end = ka, t = 3;
          break;
        default:
          this.write = ja, this.end = Ha;
          return;
      }
      this.lastNeed = 0, this.lastTotal = 0, this.lastChar = Gt.allocUnsafe(t);
    }
    Oe.prototype.write = function(e) {
      if (e.length === 0)
        return "";
      var t, r;
      if (this.lastNeed) {
        if (t = this.fillLast(e), t === undefined)
          return "";
        r = this.lastNeed, this.lastNeed = 0;
      } else
        r = 0;
      return r < e.length ? t ? t + this.text(e, r) : this.text(e, r) : t || "";
    };
    Oe.prototype.end = Ua;
    Oe.prototype.text = Na;
    Oe.prototype.fillLast = function(e) {
      if (this.lastNeed <= e.length)
        return e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
      e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, e.length), this.lastNeed -= e.length;
    };
    function $t(e) {
      return e <= 127 ? 0 : e >> 5 === 6 ? 2 : e >> 4 === 14 ? 3 : e >> 3 === 30 ? 4 : e >> 6 === 2 ? -1 : -2;
    }
    function Ma(e, t, r) {
      var n = t.length - 1;
      if (n < r)
        return 0;
      var i = $t(t[n]);
      return i >= 0 ? (i > 0 && (e.lastNeed = i - 1), i) : --n < r || i === -2 ? 0 : (i = $t(t[n]), i >= 0 ? (i > 0 && (e.lastNeed = i - 2), i) : --n < r || i === -2 ? 0 : (i = $t(t[n]), i >= 0 ? (i > 0 && (i === 2 ? i = 0 : e.lastNeed = i - 3), i) : 0));
    }
    function Oa(e, t, r) {
      if ((t[0] & 192) !== 128)
        return e.lastNeed = 0, "\uFFFD";
      if (e.lastNeed > 1 && t.length > 1) {
        if ((t[1] & 192) !== 128)
          return e.lastNeed = 1, "\uFFFD";
        if (e.lastNeed > 2 && t.length > 2 && (t[2] & 192) !== 128)
          return e.lastNeed = 2, "\uFFFD";
      }
    }
    function Fa(e) {
      var t = this.lastTotal - this.lastNeed, r = Oa(this, e, t);
      if (r !== undefined)
        return r;
      if (this.lastNeed <= e.length)
        return e.copy(this.lastChar, t, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
      e.copy(this.lastChar, t, 0, e.length), this.lastNeed -= e.length;
    }
    function Na(e, t) {
      var r = Ma(this, e, t);
      if (!this.lastNeed)
        return e.toString("utf8", t);
      this.lastTotal = r;
      var n = e.length - (r - this.lastNeed);
      return e.copy(this.lastChar, 0, n), e.toString("utf8", t, n);
    }
    function Ua(e) {
      var t = e && e.length ? this.write(e) : "";
      return this.lastNeed ? t + "\uFFFD" : t;
    }
    function Pa(e, t) {
      if ((e.length - t) % 2 === 0) {
        var r = e.toString("utf16le", t);
        if (r) {
          var n = r.charCodeAt(r.length - 1);
          if (n >= 55296 && n <= 56319)
            return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = e[e.length - 2], this.lastChar[1] = e[e.length - 1], r.slice(0, -1);
        }
        return r;
      }
      return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = e[e.length - 1], e.toString("utf16le", t, e.length - 1);
    }
    function qa(e) {
      var t = e && e.length ? this.write(e) : "";
      if (this.lastNeed) {
        var r = this.lastTotal - this.lastNeed;
        return t + this.lastChar.toString("utf16le", 0, r);
      }
      return t;
    }
    function Da(e, t) {
      var r = (e.length - t) % 3;
      return r === 0 ? e.toString("base64", t) : (this.lastNeed = 3 - r, this.lastTotal = 3, r === 1 ? this.lastChar[0] = e[e.length - 1] : (this.lastChar[0] = e[e.length - 2], this.lastChar[1] = e[e.length - 1]), e.toString("base64", t, e.length - r));
    }
    function ka(e) {
      var t = e && e.length ? this.write(e) : "";
      return this.lastNeed ? t + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : t;
    }
    function ja(e) {
      return e.toString(this.encoding);
    }
    function Ha(e) {
      return e && e.length ? this.write(e) : "";
    }
  });
  Kt = {};
  Er(Kt, { StringDecoder: () => Qe.StringDecoder, default: () => Qe.StringDecoder });
  Vt = vr(() => {
    Qe = Rr(Bn());
  });
  et = b2((jf, Ln) => {
    var Cn = fe().codes.ERR_STREAM_PREMATURE_CLOSE;
    function Wa(e) {
      var t = false;
      return function() {
        if (!t) {
          t = true;
          for (var r = arguments.length, n = new Array(r), i = 0;i < r; i++)
            n[i] = arguments[i];
          e.apply(this, n);
        }
      };
    }
    function $a() {
    }
    function Ga(e) {
      return e.setHeader && typeof e.abort == "function";
    }
    function In(e, t, r) {
      if (typeof t == "function")
        return In(e, null, t);
      t || (t = {}), r = Wa(r || $a);
      var n = t.readable || t.readable !== false && e.readable, i = t.writable || t.writable !== false && e.writable, o = function() {
        e.writable || s();
      }, a = e._writableState && e._writableState.finished, s = function() {
        i = false, a = true, n || r.call(e);
      }, u = e._readableState && e._readableState.endEmitted, l = function() {
        n = false, u = true, i || r.call(e);
      }, h2 = function(g) {
        r.call(e, g);
      }, c = function() {
        var g;
        if (n && !u)
          return (!e._readableState || !e._readableState.ended) && (g = new Cn), r.call(e, g);
        if (i && !a)
          return (!e._writableState || !e._writableState.ended) && (g = new Cn), r.call(e, g);
      }, d = function() {
        e.req.on("finish", s);
      };
      return Ga(e) ? (e.on("complete", s), e.on("abort", c), e.req ? d() : e.on("request", d)) : i && !e._writableState && (e.on("end", o), e.on("close", o)), e.on("end", l), e.on("finish", s), t.error !== false && e.on("error", h2), e.on("close", c), function() {
        e.removeListener("complete", s), e.removeListener("abort", c), e.removeListener("request", d), e.req && e.req.removeListener("finish", s), e.removeListener("end", o), e.removeListener("close", o), e.removeListener("finish", s), e.removeListener("end", l), e.removeListener("error", h2), e.removeListener("close", c);
      };
    }
    Ln.exports = In;
  });
  On = b2((Hf, Mn) => {
    var tt;
    function re(e, t, r) {
      return t in e ? Object.defineProperty(e, t, { value: r, enumerable: true, configurable: true, writable: true }) : e[t] = r, e;
    }
    var Ka = et(), ne = Symbol("lastResolve"), he = Symbol("lastReject"), Fe = Symbol("error"), rt = Symbol("ended"), ce = Symbol("lastPromise"), Yt = Symbol("handlePromise"), de = Symbol("stream");
    function ie(e, t) {
      return { value: e, done: t };
    }
    function Va(e) {
      var t = e[ne];
      if (t !== null) {
        var r = e[de].read();
        r !== null && (e[ce] = null, e[ne] = null, e[he] = null, t(ie(r, false)));
      }
    }
    function Ya(e) {
      process.nextTick(Va, e);
    }
    function Xa(e, t) {
      return function(r, n) {
        e.then(function() {
          if (t[rt]) {
            r(ie(undefined, true));
            return;
          }
          t[Yt](r, n);
        }, n);
      };
    }
    var za = Object.getPrototypeOf(function() {
    }), Za = Object.setPrototypeOf((tt = { get stream() {
      return this[de];
    }, next: function() {
      var t = this, r = this[Fe];
      if (r !== null)
        return Promise.reject(r);
      if (this[rt])
        return Promise.resolve(ie(undefined, true));
      if (this[de].destroyed)
        return new Promise(function(a, s) {
          process.nextTick(function() {
            t[Fe] ? s(t[Fe]) : a(ie(undefined, true));
          });
        });
      var n = this[ce], i;
      if (n)
        i = new Promise(Xa(n, this));
      else {
        var o = this[de].read();
        if (o !== null)
          return Promise.resolve(ie(o, false));
        i = new Promise(this[Yt]);
      }
      return this[ce] = i, i;
    } }, re(tt, Symbol.asyncIterator, function() {
      return this;
    }), re(tt, "return", function() {
      var t = this;
      return new Promise(function(r, n) {
        t[de].destroy(null, function(i) {
          if (i) {
            n(i);
            return;
          }
          r(ie(undefined, true));
        });
      });
    }), tt), za), Ja = function(t) {
      var r, n = Object.create(Za, (r = {}, re(r, de, { value: t, writable: true }), re(r, ne, { value: null, writable: true }), re(r, he, { value: null, writable: true }), re(r, Fe, { value: null, writable: true }), re(r, rt, { value: t._readableState.endEmitted, writable: true }), re(r, Yt, { value: function(o, a) {
        var s = n[de].read();
        s ? (n[ce] = null, n[ne] = null, n[he] = null, o(ie(s, false))) : (n[ne] = o, n[he] = a);
      }, writable: true }), r));
      return n[ce] = null, Ka(t, function(i) {
        if (i && i.code !== "ERR_STREAM_PREMATURE_CLOSE") {
          var o = n[he];
          o !== null && (n[ce] = null, n[ne] = null, n[he] = null, o(i)), n[Fe] = i;
          return;
        }
        var a = n[ne];
        a !== null && (n[ce] = null, n[ne] = null, n[he] = null, a(ie(undefined, true))), n[rt] = true;
      }), t.on("readable", Ya.bind(null, n)), n;
    };
    Mn.exports = Ja;
  });
  Nn = b2((Wf, Fn) => {
    Fn.exports = function() {
      throw new Error("Readable.from is not available in the browser");
    };
  });
  Ht = b2((Gf, Gn) => {
    Gn.exports = _2;
    var xe;
    _2.ReadableState = Dn;
    var $f = bt().EventEmitter, qn = function(t, r) {
      return t.listeners(r).length;
    }, Ue = _t(), nt = _e().Buffer, Qa = global.Uint8Array || function() {
    };
    function es(e) {
      return nt.from(e);
    }
    function ts(e) {
      return nt.isBuffer(e) || e instanceof Qa;
    }
    var Xt = Lt(), w;
    Xt && Xt.debuglog ? w = Xt.debuglog("stream") : w = function() {
    };
    var rs = an(), rr = Ft(), ns = Nt(), is = ns.getHighWaterMark, it = fe().codes, os = it.ERR_INVALID_ARG_TYPE, as = it.ERR_STREAM_PUSH_AFTER_EOF, ss = it.ERR_METHOD_NOT_IMPLEMENTED, fs3 = it.ERR_STREAM_UNSHIFT_AFTER_END_EVENT, Re, zt, Zt;
    Q()(_2, Ue);
    var Ne = rr.errorOrDestroy, Jt = ["error", "close", "destroy", "pause", "resume"];
    function us(e, t, r) {
      if (typeof e.prependListener == "function")
        return e.prependListener(t, r);
      !e._events || !e._events[t] ? e.on(t, r) : Array.isArray(e._events[t]) ? e._events[t].unshift(r) : e._events[t] = [r, e._events[t]];
    }
    function Dn(e, t, r) {
      xe = xe || ue(), e = e || {}, typeof r != "boolean" && (r = t instanceof xe), this.objectMode = !!e.objectMode, r && (this.objectMode = this.objectMode || !!e.readableObjectMode), this.highWaterMark = is(this, e, "readableHighWaterMark", r), this.buffer = new rs, this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = false, this.endEmitted = false, this.reading = false, this.sync = true, this.needReadable = false, this.emittedReadable = false, this.readableListening = false, this.resumeScheduled = false, this.paused = true, this.emitClose = e.emitClose !== false, this.autoDestroy = !!e.autoDestroy, this.destroyed = false, this.defaultEncoding = e.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = false, this.decoder = null, this.encoding = null, e.encoding && (Re || (Re = (Vt(), dt(Kt)).StringDecoder), this.decoder = new Re(e.encoding), this.encoding = e.encoding);
    }
    function _2(e) {
      if (xe = xe || ue(), !(this instanceof _2))
        return new _2(e);
      var t = this instanceof xe;
      this._readableState = new Dn(e, this, t), this.readable = true, e && (typeof e.read == "function" && (this._read = e.read), typeof e.destroy == "function" && (this._destroy = e.destroy)), Ue.call(this);
    }
    Object.defineProperty(_2.prototype, "destroyed", { enumerable: false, get: function() {
      return this._readableState === undefined ? false : this._readableState.destroyed;
    }, set: function(t) {
      !this._readableState || (this._readableState.destroyed = t);
    } });
    _2.prototype.destroy = rr.destroy;
    _2.prototype._undestroy = rr.undestroy;
    _2.prototype._destroy = function(e, t) {
      t(e);
    };
    _2.prototype.push = function(e, t) {
      var r = this._readableState, n;
      return r.objectMode ? n = true : typeof e == "string" && (t = t || r.defaultEncoding, t !== r.encoding && (e = nt.from(e, t), t = ""), n = true), kn(this, e, t, false, n);
    };
    _2.prototype.unshift = function(e) {
      return kn(this, e, null, true, false);
    };
    function kn(e, t, r, n, i) {
      w("readableAddChunk", t);
      var o = e._readableState;
      if (t === null)
        o.reading = false, cs(e, o);
      else {
        var a;
        if (i || (a = ls(o, t)), a)
          Ne(e, a);
        else if (o.objectMode || t && t.length > 0)
          if (typeof t != "string" && !o.objectMode && Object.getPrototypeOf(t) !== nt.prototype && (t = es(t)), n)
            o.endEmitted ? Ne(e, new fs3) : Qt(e, o, t, true);
          else if (o.ended)
            Ne(e, new as);
          else {
            if (o.destroyed)
              return false;
            o.reading = false, o.decoder && !r ? (t = o.decoder.write(t), o.objectMode || t.length !== 0 ? Qt(e, o, t, false) : tr(e, o)) : Qt(e, o, t, false);
          }
        else
          n || (o.reading = false, tr(e, o));
      }
      return !o.ended && (o.length < o.highWaterMark || o.length === 0);
    }
    function Qt(e, t, r, n) {
      t.flowing && t.length === 0 && !t.sync ? (t.awaitDrain = 0, e.emit("data", r)) : (t.length += t.objectMode ? 1 : r.length, n ? t.buffer.unshift(r) : t.buffer.push(r), t.needReadable && ot(e)), tr(e, t);
    }
    function ls(e, t) {
      var r;
      return !ts(t) && typeof t != "string" && t !== undefined && !e.objectMode && (r = new os("chunk", ["string", "Buffer", "Uint8Array"], t)), r;
    }
    _2.prototype.isPaused = function() {
      return this._readableState.flowing === false;
    };
    _2.prototype.setEncoding = function(e) {
      Re || (Re = (Vt(), dt(Kt)).StringDecoder);
      var t = new Re(e);
      this._readableState.decoder = t, this._readableState.encoding = this._readableState.decoder.encoding;
      for (var r = this._readableState.buffer.head, n = "";r !== null; )
        n += t.write(r.data), r = r.next;
      return this._readableState.buffer.clear(), n !== "" && this._readableState.buffer.push(n), this._readableState.length = n.length, this;
    };
    var Un = 1073741824;
    function hs(e) {
      return e >= Un ? e = Un : (e--, e |= e >>> 1, e |= e >>> 2, e |= e >>> 4, e |= e >>> 8, e |= e >>> 16, e++), e;
    }
    function Pn(e, t) {
      return e <= 0 || t.length === 0 && t.ended ? 0 : t.objectMode ? 1 : e !== e ? t.flowing && t.length ? t.buffer.head.data.length : t.length : (e > t.highWaterMark && (t.highWaterMark = hs(e)), e <= t.length ? e : t.ended ? t.length : (t.needReadable = true, 0));
    }
    _2.prototype.read = function(e) {
      w("read", e), e = parseInt(e, 10);
      var t = this._readableState, r = e;
      if (e !== 0 && (t.emittedReadable = false), e === 0 && t.needReadable && ((t.highWaterMark !== 0 ? t.length >= t.highWaterMark : t.length > 0) || t.ended))
        return w("read: emitReadable", t.length, t.ended), t.length === 0 && t.ended ? er(this) : ot(this), null;
      if (e = Pn(e, t), e === 0 && t.ended)
        return t.length === 0 && er(this), null;
      var n = t.needReadable;
      w("need readable", n), (t.length === 0 || t.length - e < t.highWaterMark) && (n = true, w("length less than watermark", n)), t.ended || t.reading ? (n = false, w("reading or ended", n)) : n && (w("do read"), t.reading = true, t.sync = true, t.length === 0 && (t.needReadable = true), this._read(t.highWaterMark), t.sync = false, t.reading || (e = Pn(r, t)));
      var i;
      return e > 0 ? i = Wn(e, t) : i = null, i === null ? (t.needReadable = t.length <= t.highWaterMark, e = 0) : (t.length -= e, t.awaitDrain = 0), t.length === 0 && (t.ended || (t.needReadable = true), r !== e && t.ended && er(this)), i !== null && this.emit("data", i), i;
    };
    function cs(e, t) {
      if (w("onEofChunk"), !t.ended) {
        if (t.decoder) {
          var r = t.decoder.end();
          r && r.length && (t.buffer.push(r), t.length += t.objectMode ? 1 : r.length);
        }
        t.ended = true, t.sync ? ot(e) : (t.needReadable = false, t.emittedReadable || (t.emittedReadable = true, jn(e)));
      }
    }
    function ot(e) {
      var t = e._readableState;
      w("emitReadable", t.needReadable, t.emittedReadable), t.needReadable = false, t.emittedReadable || (w("emitReadable", t.flowing), t.emittedReadable = true, process.nextTick(jn, e));
    }
    function jn(e) {
      var t = e._readableState;
      w("emitReadable_", t.destroyed, t.length, t.ended), !t.destroyed && (t.length || t.ended) && (e.emit("readable"), t.emittedReadable = false), t.needReadable = !t.flowing && !t.ended && t.length <= t.highWaterMark, nr(e);
    }
    function tr(e, t) {
      t.readingMore || (t.readingMore = true, process.nextTick(ds, e, t));
    }
    function ds(e, t) {
      for (;!t.reading && !t.ended && (t.length < t.highWaterMark || t.flowing && t.length === 0); ) {
        var r = t.length;
        if (w("maybeReadMore read 0"), e.read(0), r === t.length)
          break;
      }
      t.readingMore = false;
    }
    _2.prototype._read = function(e) {
      Ne(this, new ss("_read()"));
    };
    _2.prototype.pipe = function(e, t) {
      var r = this, n = this._readableState;
      switch (n.pipesCount) {
        case 0:
          n.pipes = e;
          break;
        case 1:
          n.pipes = [n.pipes, e];
          break;
        default:
          n.pipes.push(e);
          break;
      }
      n.pipesCount += 1, w("pipe count=%d opts=%j", n.pipesCount, t);
      var i = (!t || t.end !== false) && e !== process.stdout && e !== process.stderr, o = i ? s : E2;
      n.endEmitted ? process.nextTick(o) : r.once("end", o), e.on("unpipe", a);
      function a(v, m2) {
        w("onunpipe"), v === r && m2 && m2.hasUnpiped === false && (m2.hasUnpiped = true, h2());
      }
      function s() {
        w("onend"), e.end();
      }
      var u = ps(r);
      e.on("drain", u);
      var l = false;
      function h2() {
        w("cleanup"), e.removeListener("close", p), e.removeListener("finish", g), e.removeListener("drain", u), e.removeListener("error", d), e.removeListener("unpipe", a), r.removeListener("end", s), r.removeListener("end", E2), r.removeListener("data", c), l = true, n.awaitDrain && (!e._writableState || e._writableState.needDrain) && u();
      }
      r.on("data", c);
      function c(v) {
        w("ondata");
        var m2 = e.write(v);
        w("dest.write", m2), m2 === false && ((n.pipesCount === 1 && n.pipes === e || n.pipesCount > 1 && $n(n.pipes, e) !== -1) && !l && (w("false write response, pause", n.awaitDrain), n.awaitDrain++), r.pause());
      }
      function d(v) {
        w("onerror", v), E2(), e.removeListener("error", d), qn(e, "error") === 0 && Ne(e, v);
      }
      us(e, "error", d);
      function p() {
        e.removeListener("finish", g), E2();
      }
      e.once("close", p);
      function g() {
        w("onfinish"), e.removeListener("close", p), E2();
      }
      e.once("finish", g);
      function E2() {
        w("unpipe"), r.unpipe(e);
      }
      return e.emit("pipe", r), n.flowing || (w("pipe resume"), r.resume()), e;
    };
    function ps(e) {
      return function() {
        var r = e._readableState;
        w("pipeOnDrain", r.awaitDrain), r.awaitDrain && r.awaitDrain--, r.awaitDrain === 0 && qn(e, "data") && (r.flowing = true, nr(e));
      };
    }
    _2.prototype.unpipe = function(e) {
      var t = this._readableState, r = { hasUnpiped: false };
      if (t.pipesCount === 0)
        return this;
      if (t.pipesCount === 1)
        return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, t.flowing = false, e && e.emit("unpipe", this, r), this);
      if (!e) {
        var { pipes: n, pipesCount: i } = t;
        t.pipes = null, t.pipesCount = 0, t.flowing = false;
        for (var o = 0;o < i; o++)
          n[o].emit("unpipe", this, { hasUnpiped: false });
        return this;
      }
      var a = $n(t.pipes, e);
      return a === -1 ? this : (t.pipes.splice(a, 1), t.pipesCount -= 1, t.pipesCount === 1 && (t.pipes = t.pipes[0]), e.emit("unpipe", this, r), this);
    };
    _2.prototype.on = function(e, t) {
      var r = Ue.prototype.on.call(this, e, t), n = this._readableState;
      return e === "data" ? (n.readableListening = this.listenerCount("readable") > 0, n.flowing !== false && this.resume()) : e === "readable" && !n.endEmitted && !n.readableListening && (n.readableListening = n.needReadable = true, n.flowing = false, n.emittedReadable = false, w("on readable", n.length, n.reading), n.length ? ot(this) : n.reading || process.nextTick(ys, this)), r;
    };
    _2.prototype.addListener = _2.prototype.on;
    _2.prototype.removeListener = function(e, t) {
      var r = Ue.prototype.removeListener.call(this, e, t);
      return e === "readable" && process.nextTick(Hn, this), r;
    };
    _2.prototype.removeAllListeners = function(e) {
      var t = Ue.prototype.removeAllListeners.apply(this, arguments);
      return (e === "readable" || e === undefined) && process.nextTick(Hn, this), t;
    };
    function Hn(e) {
      var t = e._readableState;
      t.readableListening = e.listenerCount("readable") > 0, t.resumeScheduled && !t.paused ? t.flowing = true : e.listenerCount("data") > 0 && e.resume();
    }
    function ys(e) {
      w("readable nexttick read 0"), e.read(0);
    }
    _2.prototype.resume = function() {
      var e = this._readableState;
      return e.flowing || (w("resume"), e.flowing = !e.readableListening, gs(this, e)), e.paused = false, this;
    };
    function gs(e, t) {
      t.resumeScheduled || (t.resumeScheduled = true, process.nextTick(ws, e, t));
    }
    function ws(e, t) {
      w("resume", t.reading), t.reading || e.read(0), t.resumeScheduled = false, e.emit("resume"), nr(e), t.flowing && !t.reading && e.read(0);
    }
    _2.prototype.pause = function() {
      return w("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== false && (w("pause"), this._readableState.flowing = false, this.emit("pause")), this._readableState.paused = true, this;
    };
    function nr(e) {
      var t = e._readableState;
      for (w("flow", t.flowing);t.flowing && e.read() !== null; )
        ;
    }
    _2.prototype.wrap = function(e) {
      var t = this, r = this._readableState, n = false;
      e.on("end", function() {
        if (w("wrapped end"), r.decoder && !r.ended) {
          var a = r.decoder.end();
          a && a.length && t.push(a);
        }
        t.push(null);
      }), e.on("data", function(a) {
        if (w("wrapped data"), r.decoder && (a = r.decoder.write(a)), !(r.objectMode && a == null) && !(!r.objectMode && (!a || !a.length))) {
          var s = t.push(a);
          s || (n = true, e.pause());
        }
      });
      for (var i in e)
        this[i] === undefined && typeof e[i] == "function" && (this[i] = function(s) {
          return function() {
            return e[s].apply(e, arguments);
          };
        }(i));
      for (var o = 0;o < Jt.length; o++)
        e.on(Jt[o], this.emit.bind(this, Jt[o]));
      return this._read = function(a) {
        w("wrapped _read", a), n && (n = false, e.resume());
      }, this;
    };
    typeof Symbol == "function" && (_2.prototype[Symbol.asyncIterator] = function() {
      return zt === undefined && (zt = On()), zt(this);
    });
    Object.defineProperty(_2.prototype, "readableHighWaterMark", { enumerable: false, get: function() {
      return this._readableState.highWaterMark;
    } });
    Object.defineProperty(_2.prototype, "readableBuffer", { enumerable: false, get: function() {
      return this._readableState && this._readableState.buffer;
    } });
    Object.defineProperty(_2.prototype, "readableFlowing", { enumerable: false, get: function() {
      return this._readableState.flowing;
    }, set: function(t) {
      this._readableState && (this._readableState.flowing = t);
    } });
    _2._fromList = Wn;
    Object.defineProperty(_2.prototype, "readableLength", { enumerable: false, get: function() {
      return this._readableState.length;
    } });
    function Wn(e, t) {
      if (t.length === 0)
        return null;
      var r;
      return t.objectMode ? r = t.buffer.shift() : !e || e >= t.length ? (t.decoder ? r = t.buffer.join("") : t.buffer.length === 1 ? r = t.buffer.first() : r = t.buffer.concat(t.length), t.buffer.clear()) : r = t.buffer.consume(e, t.decoder), r;
    }
    function er(e) {
      var t = e._readableState;
      w("endReadable", t.endEmitted), t.endEmitted || (t.ended = true, process.nextTick(ms, t, e));
    }
    function ms(e, t) {
      if (w("endReadableNT", e.endEmitted, e.length), !e.endEmitted && e.length === 0 && (e.endEmitted = true, t.readable = false, t.emit("end"), e.autoDestroy)) {
        var r = t._writableState;
        (!r || r.autoDestroy && r.finished) && t.destroy();
      }
    }
    typeof Symbol == "function" && (_2.from = function(e, t) {
      return Zt === undefined && (Zt = Nn()), Zt(_2, e, t);
    });
    function $n(e, t) {
      for (var r = 0, n = e.length;r < n; r++)
        if (e[r] === t)
          return r;
      return -1;
    }
  });
  ir = b2((Kf, Vn) => {
    Vn.exports = z2;
    var at = fe().codes, bs = at.ERR_METHOD_NOT_IMPLEMENTED, _s = at.ERR_MULTIPLE_CALLBACK, vs = at.ERR_TRANSFORM_ALREADY_TRANSFORMING, Es = at.ERR_TRANSFORM_WITH_LENGTH_0, st = ue();
    Q()(z2, st);
    function xs(e, t) {
      var r = this._transformState;
      r.transforming = false;
      var n = r.writecb;
      if (n === null)
        return this.emit("error", new _s);
      r.writechunk = null, r.writecb = null, t != null && this.push(t), n(e);
      var i = this._readableState;
      i.reading = false, (i.needReadable || i.length < i.highWaterMark) && this._read(i.highWaterMark);
    }
    function z2(e) {
      if (!(this instanceof z2))
        return new z2(e);
      st.call(this, e), this._transformState = { afterTransform: xs.bind(this), needTransform: false, transforming: false, writecb: null, writechunk: null, writeencoding: null }, this._readableState.needReadable = true, this._readableState.sync = false, e && (typeof e.transform == "function" && (this._transform = e.transform), typeof e.flush == "function" && (this._flush = e.flush)), this.on("prefinish", Rs);
    }
    function Rs() {
      var e = this;
      typeof this._flush == "function" && !this._readableState.destroyed ? this._flush(function(t, r) {
        Kn(e, t, r);
      }) : Kn(this, null, null);
    }
    z2.prototype.push = function(e, t) {
      return this._transformState.needTransform = false, st.prototype.push.call(this, e, t);
    };
    z2.prototype._transform = function(e, t, r) {
      r(new bs("_transform()"));
    };
    z2.prototype._write = function(e, t, r) {
      var n = this._transformState;
      if (n.writecb = r, n.writechunk = e, n.writeencoding = t, !n.transforming) {
        var i = this._readableState;
        (n.needTransform || i.needReadable || i.length < i.highWaterMark) && this._read(i.highWaterMark);
      }
    };
    z2.prototype._read = function(e) {
      var t = this._transformState;
      t.writechunk !== null && !t.transforming ? (t.transforming = true, this._transform(t.writechunk, t.writeencoding, t.afterTransform)) : t.needTransform = true;
    };
    z2.prototype._destroy = function(e, t) {
      st.prototype._destroy.call(this, e, function(r) {
        t(r);
      });
    };
    function Kn(e, t, r) {
      if (t)
        return e.emit("error", t);
      if (r != null && e.push(r), e._writableState.length)
        throw new Es;
      if (e._transformState.transforming)
        throw new vs;
      return e.push(null);
    }
  });
  zn = b2((Vf, Xn) => {
    Xn.exports = Pe;
    var Yn = ir();
    Q()(Pe, Yn);
    function Pe(e) {
      if (!(this instanceof Pe))
        return new Pe(e);
      Yn.call(this, e);
    }
    Pe.prototype._transform = function(e, t, r) {
      r(null, e);
    };
  });
  ti = b2((Yf, ei) => {
    var or;
    function Ss(e) {
      var t = false;
      return function() {
        t || (t = true, e.apply(undefined, arguments));
      };
    }
    var Qn = fe().codes, Ts = Qn.ERR_MISSING_ARGS, As = Qn.ERR_STREAM_DESTROYED;
    function Zn(e) {
      if (e)
        throw e;
    }
    function Bs(e) {
      return e.setHeader && typeof e.abort == "function";
    }
    function Cs(e, t, r, n) {
      n = Ss(n);
      var i = false;
      e.on("close", function() {
        i = true;
      }), or === undefined && (or = et()), or(e, { readable: t, writable: r }, function(a) {
        if (a)
          return n(a);
        i = true, n();
      });
      var o = false;
      return function(a) {
        if (!i && !o) {
          if (o = true, Bs(e))
            return e.abort();
          if (typeof e.destroy == "function")
            return e.destroy();
          n(a || new As("pipe"));
        }
      };
    }
    function Jn(e) {
      e();
    }
    function Is(e, t) {
      return e.pipe(t);
    }
    function Ls(e) {
      return !e.length || typeof e[e.length - 1] != "function" ? Zn : e.pop();
    }
    function Ms() {
      for (var e = arguments.length, t = new Array(e), r = 0;r < e; r++)
        t[r] = arguments[r];
      var n = Ls(t);
      if (Array.isArray(t[0]) && (t = t[0]), t.length < 2)
        throw new Ts("streams");
      var i, o = t.map(function(a, s) {
        var u = s < t.length - 1, l = s > 0;
        return Cs(a, u, l, function(h2) {
          i || (i = h2), h2 && o.forEach(Jn), !u && (o.forEach(Jn), n(i));
        });
      });
      return t.reduce(Is);
    }
    ei.exports = Ms;
  });
  ar = b2((q2, ri) => {
    q2 = ri.exports = Ht();
    q2.Stream = q2;
    q2.Readable = q2;
    q2.Writable = Dt();
    q2.Duplex = ue();
    q2.Transform = ir();
    q2.PassThrough = zn();
    q2.finished = et();
    q2.pipeline = ti();
  });
  ur = b2((fr) => {
    var ni = gt(), Os = Q(), ii = ar(), ft = fr.readyStates = { UNSENT: 0, OPENED: 1, HEADERS_RECEIVED: 2, LOADING: 3, DONE: 4 }, sr = fr.IncomingMessage = function(e, t, r, n) {
      var i = this;
      if (ii.Readable.call(i), i._mode = r, i.headers = {}, i.rawHeaders = [], i.trailers = {}, i.rawTrailers = [], i.on("end", function() {
        process.nextTick(function() {
          i.emit("close");
        });
      }), r === "fetch") {
        let c = function() {
          a.read().then(function(d) {
            if (!i._destroyed) {
              if (n(d.done), d.done) {
                i.push(null);
                return;
              }
              i.push(Buffer.from(d.value)), c();
            }
          }).catch(function(d) {
            n(true), i._destroyed || i.emit("error", d);
          });
        };
        var h2 = c;
        if (i._fetchResponse = t, i.url = t.url, i.statusCode = t.status, i.statusMessage = t.statusText, t.headers.forEach(function(d, p) {
          i.headers[p.toLowerCase()] = d, i.rawHeaders.push(p, d);
        }), ni.writableStream) {
          var o = new WritableStream({ write: function(d) {
            return n(false), new Promise(function(p, g) {
              i._destroyed ? g() : i.push(Buffer.from(d)) ? p() : i._resumeFetch = p;
            });
          }, close: function() {
            n(true), i._destroyed || i.push(null);
          }, abort: function(d) {
            n(true), i._destroyed || i.emit("error", d);
          } });
          try {
            t.body.pipeTo(o).catch(function(d) {
              n(true), i._destroyed || i.emit("error", d);
            });
            return;
          } catch {
          }
        }
        var a = t.body.getReader();
        c();
      } else {
        i._xhr = e, i._pos = 0, i.url = e.responseURL, i.statusCode = e.status, i.statusMessage = e.statusText;
        var s = e.getAllResponseHeaders().split(/\r?\n/);
        if (s.forEach(function(c) {
          var d = c.match(/^([^:]+):\s*(.*)/);
          if (d) {
            var p = d[1].toLowerCase();
            p === "set-cookie" ? (i.headers[p] === undefined && (i.headers[p] = []), i.headers[p].push(d[2])) : i.headers[p] !== undefined ? i.headers[p] += ", " + d[2] : i.headers[p] = d[2], i.rawHeaders.push(d[1], d[2]);
          }
        }), i._charset = "x-user-defined", !ni.overrideMimeType) {
          var u = i.rawHeaders["mime-type"];
          if (u) {
            var l = u.match(/;\s*charset=([^;])(;|$)/);
            l && (i._charset = l[1].toLowerCase());
          }
          i._charset || (i._charset = "utf-8");
        }
      }
    };
    Os(sr, ii.Readable);
    sr.prototype._read = function() {
      var e = this, t = e._resumeFetch;
      t && (e._resumeFetch = null, t());
    };
    sr.prototype._onXHRProgress = function(e) {
      var t = this, r = t._xhr, n = null;
      switch (t._mode) {
        case "text":
          if (n = r.responseText, n.length > t._pos) {
            var i = n.substr(t._pos);
            if (t._charset === "x-user-defined") {
              for (var o = Buffer.alloc(i.length), a = 0;a < i.length; a++)
                o[a] = i.charCodeAt(a) & 255;
              t.push(o);
            } else
              t.push(i, t._charset);
            t._pos = n.length;
          }
          break;
        case "arraybuffer":
          if (r.readyState !== ft.DONE || !r.response)
            break;
          n = r.response, t.push(Buffer.from(new Uint8Array(n)));
          break;
        case "moz-chunked-arraybuffer":
          if (n = r.response, r.readyState !== ft.LOADING || !n)
            break;
          t.push(Buffer.from(new Uint8Array(n)));
          break;
        case "ms-stream":
          if (n = r.response, r.readyState !== ft.LOADING)
            break;
          var s = new global.MSStreamReader;
          s.onprogress = function() {
            s.result.byteLength > t._pos && (t.push(Buffer.from(new Uint8Array(s.result.slice(t._pos)))), t._pos = s.result.byteLength);
          }, s.onload = function() {
            e(true), t.push(null);
          }, s.readAsArrayBuffer(n);
          break;
      }
      t._xhr.readyState === ft.DONE && t._mode !== "ms-stream" && (e(true), t.push(null));
    };
  });
  fi = b2((zf, si) => {
    var pe = gt(), Fs = Q(), ai = ur(), lr = ar(), Ns = ai.IncomingMessage, oi = ai.readyStates;
    function Us(e, t) {
      return pe.fetch && t ? "fetch" : pe.mozchunkedarraybuffer ? "moz-chunked-arraybuffer" : pe.msstream ? "ms-stream" : pe.arraybuffer && e ? "arraybuffer" : "text";
    }
    var M = si.exports = function(e) {
      var t = this;
      lr.Writable.call(t), t._opts = e, t._body = [], t._headers = {}, e.auth && t.setHeader("Authorization", "Basic " + Buffer.from(e.auth).toString("base64")), Object.keys(e.headers).forEach(function(i) {
        t.setHeader(i, e.headers[i]);
      });
      var r, n = true;
      if (e.mode === "disable-fetch" || "requestTimeout" in e && !pe.abortController)
        n = false, r = true;
      else if (e.mode === "prefer-streaming")
        r = false;
      else if (e.mode === "allow-wrong-content-type")
        r = !pe.overrideMimeType;
      else if (!e.mode || e.mode === "default" || e.mode === "prefer-fast")
        r = true;
      else
        throw new Error("Invalid value for opts.mode");
      t._mode = Us(r, n), t._fetchTimer = null, t._socketTimeout = null, t._socketTimer = null, t.on("finish", function() {
        t._onFinish();
      });
    };
    Fs(M, lr.Writable);
    M.prototype.setHeader = function(e, t) {
      var r = this, n = e.toLowerCase();
      qs.indexOf(n) === -1 && (r._headers[n] = { name: e, value: t });
    };
    M.prototype.getHeader = function(e) {
      var t = this._headers[e.toLowerCase()];
      return t ? t.value : null;
    };
    M.prototype.removeHeader = function(e) {
      var t = this;
      delete t._headers[e.toLowerCase()];
    };
    M.prototype._onFinish = function() {
      var e = this;
      if (!e._destroyed) {
        var t = e._opts;
        "timeout" in t && t.timeout !== 0 && e.setTimeout(t.timeout);
        var r = e._headers, n = null;
        t.method !== "GET" && t.method !== "HEAD" && (n = new Blob(e._body, { type: (r["content-type"] || {}).value || "" }));
        var i = [];
        if (Object.keys(r).forEach(function(u) {
          var l = r[u].name, h2 = r[u].value;
          Array.isArray(h2) ? h2.forEach(function(c) {
            i.push([l, c]);
          }) : i.push([l, h2]);
        }), e._mode === "fetch") {
          var o = null;
          if (pe.abortController) {
            var a = new AbortController;
            o = a.signal, e._fetchAbortController = a, "requestTimeout" in t && t.requestTimeout !== 0 && (e._fetchTimer = global.setTimeout(function() {
              e.emit("requestTimeout"), e._fetchAbortController && e._fetchAbortController.abort();
            }, t.requestTimeout));
          }
          global.fetch(e._opts.url, { method: e._opts.method, headers: i, body: n || undefined, mode: "cors", credentials: t.withCredentials ? "include" : "same-origin", signal: o }).then(function(u) {
            e._fetchResponse = u, e._resetTimers(false), e._connect();
          }, function(u) {
            e._resetTimers(true), e._destroyed || e.emit("error", u);
          });
        } else {
          var s = e._xhr = new global.XMLHttpRequest;
          try {
            s.open(e._opts.method, e._opts.url, true);
          } catch (u) {
            process.nextTick(function() {
              e.emit("error", u);
            });
            return;
          }
          "responseType" in s && (s.responseType = e._mode), "withCredentials" in s && (s.withCredentials = !!t.withCredentials), e._mode === "text" && "overrideMimeType" in s && s.overrideMimeType("text/plain; charset=x-user-defined"), "requestTimeout" in t && (s.timeout = t.requestTimeout, s.ontimeout = function() {
            e.emit("requestTimeout");
          }), i.forEach(function(u) {
            s.setRequestHeader(u[0], u[1]);
          }), e._response = null, s.onreadystatechange = function() {
            switch (s.readyState) {
              case oi.LOADING:
              case oi.DONE:
                e._onXHRProgress();
                break;
            }
          }, e._mode === "moz-chunked-arraybuffer" && (s.onprogress = function() {
            e._onXHRProgress();
          }), s.onerror = function() {
            e._destroyed || (e._resetTimers(true), e.emit("error", new Error("XHR error")));
          };
          try {
            s.send(n);
          } catch (u) {
            process.nextTick(function() {
              e.emit("error", u);
            });
            return;
          }
        }
      }
    };
    function Ps(e) {
      try {
        var t = e.status;
        return t !== null && t !== 0;
      } catch {
        return false;
      }
    }
    M.prototype._onXHRProgress = function() {
      var e = this;
      e._resetTimers(false), !(!Ps(e._xhr) || e._destroyed) && (e._response || e._connect(), e._response._onXHRProgress(e._resetTimers.bind(e)));
    };
    M.prototype._connect = function() {
      var e = this;
      e._destroyed || (e._response = new Ns(e._xhr, e._fetchResponse, e._mode, e._resetTimers.bind(e)), e._response.on("error", function(t) {
        e.emit("error", t);
      }), e.emit("response", e._response));
    };
    M.prototype._write = function(e, t, r) {
      var n = this;
      n._body.push(e), r();
    };
    M.prototype._resetTimers = function(e) {
      var t = this;
      global.clearTimeout(t._socketTimer), t._socketTimer = null, e ? (global.clearTimeout(t._fetchTimer), t._fetchTimer = null) : t._socketTimeout && (t._socketTimer = global.setTimeout(function() {
        t.emit("timeout");
      }, t._socketTimeout));
    };
    M.prototype.abort = M.prototype.destroy = function(e) {
      var t = this;
      t._destroyed = true, t._resetTimers(true), t._response && (t._response._destroyed = true), t._xhr ? t._xhr.abort() : t._fetchAbortController && t._fetchAbortController.abort(), e && t.emit("error", e);
    };
    M.prototype.end = function(e, t, r) {
      var n = this;
      typeof e == "function" && (r = e, e = undefined), lr.Writable.prototype.end.call(n, e, t, r);
    };
    M.prototype.setTimeout = function(e, t) {
      var r = this;
      t && r.once("timeout", t), r._socketTimeout = e, r._resetTimers(false);
    };
    M.prototype.flushHeaders = function() {
    };
    M.prototype.setNoDelay = function() {
    };
    M.prototype.setSocketKeepAlive = function() {
    };
    var qs = ["accept-charset", "accept-encoding", "access-control-request-headers", "access-control-request-method", "connection", "content-length", "cookie", "cookie2", "date", "dnt", "expect", "host", "keep-alive", "origin", "referer", "te", "trailer", "transfer-encoding", "upgrade", "via"];
  });
  li = b2((Zf, ui) => {
    ui.exports = ks;
    var Ds = Object.prototype.hasOwnProperty;
    function ks() {
      for (var e = {}, t = 0;t < arguments.length; t++) {
        var r = arguments[t];
        for (var n in r)
          Ds.call(r, n) && (e[n] = r[n]);
      }
      return e;
    }
  });
  ci = b2((Jf, hi) => {
    hi.exports = { 100: "Continue", 101: "Switching Protocols", 102: "Processing", 200: "OK", 201: "Created", 202: "Accepted", 203: "Non-Authoritative Information", 204: "No Content", 205: "Reset Content", 206: "Partial Content", 207: "Multi-Status", 208: "Already Reported", 226: "IM Used", 300: "Multiple Choices", 301: "Moved Permanently", 302: "Found", 303: "See Other", 304: "Not Modified", 305: "Use Proxy", 307: "Temporary Redirect", 308: "Permanent Redirect", 400: "Bad Request", 401: "Unauthorized", 402: "Payment Required", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 406: "Not Acceptable", 407: "Proxy Authentication Required", 408: "Request Timeout", 409: "Conflict", 410: "Gone", 411: "Length Required", 412: "Precondition Failed", 413: "Payload Too Large", 414: "URI Too Long", 415: "Unsupported Media Type", 416: "Range Not Satisfiable", 417: "Expectation Failed", 418: "I'm a teapot", 421: "Misdirected Request", 422: "Unprocessable Entity", 423: "Locked", 424: "Failed Dependency", 425: "Unordered Collection", 426: "Upgrade Required", 428: "Precondition Required", 429: "Too Many Requests", 431: "Request Header Fields Too Large", 451: "Unavailable For Legal Reasons", 500: "Internal Server Error", 501: "Not Implemented", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout", 505: "HTTP Version Not Supported", 506: "Variant Also Negotiates", 507: "Insufficient Storage", 508: "Loop Detected", 509: "Bandwidth Limit Exceeded", 510: "Not Extended", 511: "Network Authentication Required" };
  });
  _i = {};
  Er(_i, { decode: () => pr, default: () => Ys, encode: () => yr, toASCII: () => bi, toUnicode: () => mi, ucs2decode: () => dr, ucs2encode: () => gi });
  vi = vr(() => {
    pi = "-", js = /^xn--/, Hs = /[^\0-\x7F]/, Ws = /[\x2E\u3002\uFF0E\uFF61]/g, $s = { overflow: "Overflow: input needs wider integers to process", "not-basic": "Illegal input >= 0x80 (not a basic code point)", "invalid-input": "Invalid input" }, hr = 36 - 1, K = Math.floor, cr = String.fromCharCode;
    gi = (e) => String.fromCodePoint(...e), Ks = function(e) {
      return e >= 48 && e < 58 ? 26 + (e - 48) : e >= 65 && e < 91 ? e - 65 : e >= 97 && e < 123 ? e - 97 : 36;
    }, di = function(e, t) {
      return e + 22 + 75 * (e < 26) - ((t != 0) << 5);
    }, wi = function(e, t, r) {
      let n = 0;
      for (e = r ? K(e / 700) : e >> 1, e += K(e / t);e > hr * 26 >> 1; n += 36)
        e = K(e / hr);
      return K(n + (hr + 1) * e / (e + 38));
    }, pr = function(e) {
      let t = [], r = e.length, n = 0, i = 128, o = 72, a = e.lastIndexOf(pi);
      a < 0 && (a = 0);
      for (let s = 0;s < a; ++s)
        e.charCodeAt(s) >= 128 && oe("not-basic"), t.push(e.charCodeAt(s));
      for (let s = a > 0 ? a + 1 : 0;s < r; ) {
        let u = n;
        for (let h2 = 1, c = 36;; c += 36) {
          s >= r && oe("invalid-input");
          let d = Ks(e.charCodeAt(s++));
          d >= 36 && oe("invalid-input"), d > K((2147483647 - n) / h2) && oe("overflow"), n += d * h2;
          let p = c <= o ? 1 : c >= o + 26 ? 26 : c - o;
          if (d < p)
            break;
          let g = 36 - p;
          h2 > K(2147483647 / g) && oe("overflow"), h2 *= g;
        }
        let l = t.length + 1;
        o = wi(n - u, l, u == 0), K(n / l) > 2147483647 - i && oe("overflow"), i += K(n / l), n %= l, t.splice(n++, 0, i);
      }
      return String.fromCodePoint(...t);
    }, yr = function(e) {
      let t = [];
      e = dr(e);
      let r = e.length, n = 128, i = 0, o = 72;
      for (let u of e)
        u < 128 && t.push(cr(u));
      let a = t.length, s = a;
      for (a && t.push(pi);s < r; ) {
        let u = 2147483647;
        for (let h2 of e)
          h2 >= n && h2 < u && (u = h2);
        let l = s + 1;
        u - n > K((2147483647 - i) / l) && oe("overflow"), i += (u - n) * l, n = u;
        for (let h2 of e)
          if (h2 < n && ++i > 2147483647 && oe("overflow"), h2 === n) {
            let c = i;
            for (let d = 36;; d += 36) {
              let p = d <= o ? 1 : d >= o + 26 ? 26 : d - o;
              if (c < p)
                break;
              let g = c - p, E2 = 36 - p;
              t.push(cr(di(p + g % E2, 0))), c = K(g / E2);
            }
            t.push(cr(di(c, 0))), o = wi(i, l, s === a), i = 0, ++s;
          }
        ++i, ++n;
      }
      return t.join("");
    }, mi = function(e) {
      return yi(e, function(t) {
        return js.test(t) ? pr(t.slice(4).toLowerCase()) : t;
      });
    }, bi = function(e) {
      return yi(e, function(t) {
        return Hs.test(t) ? "xn--" + yr(t) : t;
      });
    }, Vs = { version: "2.1.0", ucs2: { decode: dr, encode: gi }, decode: pr, encode: yr, toASCII: bi, toUnicode: mi }, Ys = Vs;
  });
  xi = b2((Qf, Ei) => {
    Ei.exports = { isString: function(e) {
      return typeof e == "string";
    }, isObject: function(e) {
      return typeof e == "object" && e !== null;
    }, isNull: function(e) {
      return e === null;
    }, isNullOrUndefined: function(e) {
      return e == null;
    } };
  });
  Si = b2((eu, Ri) => {
    var Xs = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
      return typeof e;
    } : function(e) {
      return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
    }, zs = Object.keys || function() {
      var e = Object.prototype.hasOwnProperty, t = !{ toString: null }.propertyIsEnumerable("toString"), r = ["toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "constructor"], n = r.length;
      return function(i) {
        if (typeof i != "function" && ((typeof i > "u" ? "undefined" : Xs(i)) !== "object" || i === null))
          throw new TypeError("Object.keys called on non-object");
        var o = [], a, s;
        for (a in i)
          e.call(i, a) && o.push(a);
        if (t)
          for (s = 0;s < n; s++)
            e.call(i, r[s]) && o.push(r[s]);
        return o;
      };
    }();
    Ri.exports = zs;
  });
  Ni = b2((tu, Fi) => {
    var Li = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
      return typeof e;
    } : function(e) {
      return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
    }, lt = Fi.exports = { unescapeBuffer: ef, unescape: Oi, escape: rf, stringify: Bi, encode: Bi, parse: Ii, decode: Ii }, Zs = _e().Buffer, Js = Si(), Qs = function(t) {
      return Object.prototype.toString.call(t) === "[object Array]";
    }, Ti = function(t, r, n) {
      var i;
      if (t == null)
        throw new TypeError('"arr" is null or not defined');
      var o = Object(t), a = o.length >>> 0;
      if (a === 0)
        return -1;
      var s = n | 0;
      if (s >= a)
        return -1;
      for (i = Math.max(s >= 0 ? s : a - Math.abs(s), 0);i < a; ) {
        if (i in o && o[i] === r)
          return i;
        i++;
      }
      return -1;
    };
    function Mi() {
    }
    Mi.prototype = Object.create ? Object.create(null) : {};
    var Ai = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1, -1, -1, -1, -1, -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    function ef(e, t) {
      for (var r = Zs.allocUnsafe(e.length), n = 0, i, o, a, s, u = 0, l = 0;; u++) {
        if (u < e.length)
          s = e.charCodeAt(u);
        else {
          n > 0 && (r[l++] = 37, n === 2 && (r[l++] = a));
          break;
        }
        switch (n) {
          case 0:
            switch (s) {
              case 37:
                i = 0, o = 0, n = 1;
                break;
              case 43:
                t && (s = 32);
              default:
                r[l++] = s;
                break;
            }
            break;
          case 1:
            if (a = s, i = Ai[s], !(i >= 0)) {
              r[l++] = 37, r[l++] = s, n = 0;
              break;
            }
            n = 2;
            break;
          case 2:
            if (n = 0, o = Ai[s], !(o >= 0)) {
              r[l++] = 37, r[l++] = a, r[l++] = s;
              break;
            }
            r[l++] = 16 * i + o;
            break;
        }
      }
      return r.slice(0, l);
    }
    function Oi(e, t) {
      try {
        return decodeURIComponent(e);
      } catch {
        return lt.unescapeBuffer(e, t).toString();
      }
    }
    var k = [];
    for (Se = 0;Se < 256; ++Se)
      k[Se] = "%" + ((Se < 16 ? "0" : "") + Se.toString(16)).toUpperCase();
    var Se, tf = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0];
    function rf(e) {
      typeof e != "string" && ((typeof e > "u" ? "undefined" : Li(e)) === "object" ? e = String(e) : e += "");
      for (var t = "", r = 0, n = 0;n < e.length; ++n) {
        var i = e.charCodeAt(n);
        if (i < 128) {
          if (tf[i] === 1)
            continue;
          r < n && (t += e.slice(r, n)), r = n + 1, t += k[i];
          continue;
        }
        if (r < n && (t += e.slice(r, n)), i < 2048) {
          r = n + 1, t += k[192 | i >> 6] + k[128 | i & 63];
          continue;
        }
        if (i < 55296 || i >= 57344) {
          r = n + 1, t += k[224 | i >> 12] + k[128 | i >> 6 & 63] + k[128 | i & 63];
          continue;
        }
        ++n;
        var o;
        if (n < e.length)
          o = e.charCodeAt(n) & 1023;
        else
          throw new URIError("URI malformed");
        r = n + 1, i = 65536 + ((i & 1023) << 10 | o), t += k[240 | i >> 18] + k[128 | i >> 12 & 63] + k[128 | i >> 6 & 63] + k[128 | i & 63];
      }
      return r === 0 ? e : r < e.length ? t + e.slice(r) : t;
    }
    function gr(e) {
      return typeof e == "string" ? e : typeof e == "number" && isFinite(e) ? "" + e : typeof e == "boolean" ? e ? "true" : "false" : "";
    }
    function Bi(e, t, r, n) {
      t = t || "&", r = r || "=";
      var i = lt.escape;
      if (n && typeof n.encodeURIComponent == "function" && (i = n.encodeURIComponent), e !== null && (typeof e > "u" ? "undefined" : Li(e)) === "object") {
        for (var o = Js(e), a = o.length, s = a - 1, u = "", l = 0;l < a; ++l) {
          var h2 = o[l], c = e[h2], d = i(gr(h2)) + r;
          if (Qs(c)) {
            for (var p = c.length, g = p - 1, E2 = 0;E2 < p; ++E2)
              u += d + i(gr(c[E2])), E2 < g && (u += t);
            p && l < s && (u += t);
          } else
            u += d + i(gr(c)), l < s && (u += t);
        }
        return u;
      }
      return "";
    }
    function Ci(e) {
      if (e.length === 0)
        return [];
      if (e.length === 1)
        return [e.charCodeAt(0)];
      for (var t = [], r = 0;r < e.length; ++r)
        t[t.length] = e.charCodeAt(r);
      return t;
    }
    var nf = [38], of = [61];
    function Ii(e, t, r, n) {
      var i = new Mi;
      if (typeof e != "string" || e.length === 0)
        return i;
      var o = t ? Ci(t + "") : nf, a = r ? Ci(r + "") : of, s = o.length, u = a.length, l = 1000;
      n && typeof n.maxKeys == "number" && (l = n.maxKeys > 0 ? n.maxKeys : -1);
      var h2 = lt.unescape;
      n && typeof n.decodeURIComponent == "function" && (h2 = n.decodeURIComponent);
      for (var c = h2 !== Oi, d = [], p = 0, g = 0, E2 = 0, v = 0, m2 = "", y2 = "", R2 = c, I = c, T2 = 0, S = 0;S < e.length; ++S) {
        var B = e.charCodeAt(S);
        if (B === o[E2]) {
          if (++E2 === s) {
            var F = S - E2 + 1;
            if (v < u ? g < F && (m2 += e.slice(g, F)) : g < F && (y2 += e.slice(g, F)), R2 && (m2 = ut(m2, h2)), I && (y2 = ut(y2, h2)), m2 || y2 || g - p > s || S === 0)
              if (Ti(d, m2) === -1)
                i[m2] = y2, d[d.length] = m2;
              else {
                var L2 = i[m2] || "";
                L2.pop ? L2[L2.length] = y2 : L2 && (i[m2] = [L2, y2]);
              }
            else
              S === 1 && delete i[m2];
            if (--l === 0)
              break;
            R2 = I = c, T2 = 0, m2 = y2 = "", p = g, g = S + 1, E2 = v = 0;
          }
          continue;
        } else
          E2 = 0, I || (B === 37 ? T2 = 1 : T2 > 0 && (B >= 48 && B <= 57 || B >= 65 && B <= 70 || B >= 97 && B <= 102) ? ++T2 === 3 && (I = true) : T2 = 0);
        if (v < u)
          if (B === a[v]) {
            if (++v === u) {
              var Y = S - v + 1;
              g < Y && (m2 += e.slice(g, Y)), T2 = 0, g = S + 1;
            }
            continue;
          } else
            v = 0, R2 || (B === 37 ? T2 = 1 : T2 > 0 && (B >= 48 && B <= 57 || B >= 65 && B <= 70 || B >= 97 && B <= 102) ? ++T2 === 3 && (R2 = true) : T2 = 0);
        B === 43 && (v < u ? (g < S && (m2 += e.slice(g, S)), m2 += "%20", R2 = true) : (g < S && (y2 += e.slice(g, S)), y2 += "%20", I = true), g = S + 1);
      }
      if (l !== 0 && (g < e.length || v > 0))
        if (g < e.length && (v < u ? m2 += e.slice(g) : E2 < s && (y2 += e.slice(g))), R2 && (m2 = ut(m2, h2)), I && (y2 = ut(y2, h2)), Ti(d, m2) === -1)
          i[m2] = y2, d[d.length] = m2;
        else {
          var Z = i[m2];
          Z.pop ? Z[Z.length] = y2 : i[m2] = [Z, y2];
        }
      return i;
    }
    function ut(e, t) {
      try {
        return t(e);
      } catch {
        return lt.unescape(e, true);
      }
    }
  });
  Di = b2((Ae) => {
    var af = (vi(), dt(_i)), V = xi();
    Ae.parse = qe;
    Ae.resolve = gf;
    Ae.resolveObject = wf;
    Ae.format = yf;
    Ae.Url = D2;
    function D2() {
      this.protocol = null, this.slashes = null, this.auth = null, this.host = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.query = null, this.pathname = null, this.path = null, this.href = null;
    }
    var sf = /^([a-z0-9.+-]+:)/i, ff = /:[0-9]*$/, uf = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, lf = ["<", ">", '"', "`", " ", "\r", `
`, "	"], hf = ["{", "}", "|", "\\", "^", "`"].concat(lf), wr = ["'"].concat(hf), Ui = ["%", "/", "?", ";", "#"].concat(wr), Pi = ["/", "?", "#"], cf = 255, qi = /^[+a-z0-9A-Z_-]{0,63}$/, df = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, pf = { javascript: true, "javascript:": true }, mr = { javascript: true, "javascript:": true }, Te = { http: true, https: true, ftp: true, gopher: true, file: true, "http:": true, "https:": true, "ftp:": true, "gopher:": true, "file:": true }, br = Ni();
    function qe(e, t, r) {
      if (e && V.isObject(e) && e instanceof D2)
        return e;
      var n = new D2;
      return n.parse(e, t, r), n;
    }
    D2.prototype.parse = function(e, t, r) {
      if (!V.isString(e))
        throw new TypeError("Parameter 'url' must be a string, not " + typeof e);
      var n = e.indexOf("?"), i = n !== -1 && n < e.indexOf("#") ? "?" : "#", o = e.split(i), a = /\\/g;
      o[0] = o[0].replace(a, "/"), e = o.join(i);
      var s = e;
      if (s = s.trim(), !r && e.split("#").length === 1) {
        var u = uf.exec(s);
        if (u)
          return this.path = s, this.href = s, this.pathname = u[1], u[2] ? (this.search = u[2], t ? this.query = br.parse(this.search.substr(1)) : this.query = this.search.substr(1)) : t && (this.search = "", this.query = {}), this;
      }
      var l = sf.exec(s);
      if (l) {
        l = l[0];
        var h2 = l.toLowerCase();
        this.protocol = h2, s = s.substr(l.length);
      }
      if (r || l || s.match(/^\/\/[^@\/]+@[^@\/]+/)) {
        var c = s.substr(0, 2) === "//";
        c && !(l && mr[l]) && (s = s.substr(2), this.slashes = true);
      }
      if (!mr[l] && (c || l && !Te[l])) {
        for (var d = -1, p = 0;p < Pi.length; p++) {
          var g = s.indexOf(Pi[p]);
          g !== -1 && (d === -1 || g < d) && (d = g);
        }
        var E2, v;
        d === -1 ? v = s.lastIndexOf("@") : v = s.lastIndexOf("@", d), v !== -1 && (E2 = s.slice(0, v), s = s.slice(v + 1), this.auth = decodeURIComponent(E2)), d = -1;
        for (var p = 0;p < Ui.length; p++) {
          var g = s.indexOf(Ui[p]);
          g !== -1 && (d === -1 || g < d) && (d = g);
        }
        d === -1 && (d = s.length), this.host = s.slice(0, d), s = s.slice(d), this.parseHost(), this.hostname = this.hostname || "";
        var m2 = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
        if (!m2)
          for (var y2 = this.hostname.split(/\./), p = 0, R2 = y2.length;p < R2; p++) {
            var I = y2[p];
            if (!!I && !I.match(qi)) {
              for (var T2 = "", S = 0, B = I.length;S < B; S++)
                I.charCodeAt(S) > 127 ? T2 += "x" : T2 += I[S];
              if (!T2.match(qi)) {
                var F = y2.slice(0, p), L2 = y2.slice(p + 1), Y = I.match(df);
                Y && (F.push(Y[1]), L2.unshift(Y[2])), L2.length && (s = "/" + L2.join(".") + s), this.hostname = F.join(".");
                break;
              }
            }
          }
        this.hostname.length > cf ? this.hostname = "" : this.hostname = this.hostname.toLowerCase(), m2 || (this.hostname = af.toASCII(this.hostname));
        var Z = this.port ? ":" + this.port : "", Wi = this.hostname || "";
        this.host = Wi + Z, this.href += this.host, m2 && (this.hostname = this.hostname.substr(1, this.hostname.length - 2), s[0] !== "/" && (s = "/" + s));
      }
      if (!pf[h2])
        for (var p = 0, R2 = wr.length;p < R2; p++) {
          var Be = wr[p];
          if (s.indexOf(Be) !== -1) {
            var ht = encodeURIComponent(Be);
            ht === Be && (ht = escape(Be)), s = s.split(Be).join(ht);
          }
        }
      var ct = s.indexOf("#");
      ct !== -1 && (this.hash = s.substr(ct), s = s.slice(0, ct));
      var De = s.indexOf("?");
      if (De !== -1 ? (this.search = s.substr(De), this.query = s.substr(De + 1), t && (this.query = br.parse(this.query)), s = s.slice(0, De)) : t && (this.search = "", this.query = {}), s && (this.pathname = s), Te[h2] && this.hostname && !this.pathname && (this.pathname = "/"), this.pathname || this.search) {
        var Z = this.pathname || "", $i = this.search || "";
        this.path = Z + $i;
      }
      return this.href = this.format(), this;
    };
    function yf(e) {
      return V.isString(e) && (e = qe(e)), e instanceof D2 ? e.format() : D2.prototype.format.call(e);
    }
    D2.prototype.format = function() {
      var e = this.auth || "";
      e && (e = encodeURIComponent(e), e = e.replace(/%3A/i, ":"), e += "@");
      var t = this.protocol || "", r = this.pathname || "", n = this.hash || "", i = false, o = "";
      this.host ? i = e + this.host : this.hostname && (i = e + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]"), this.port && (i += ":" + this.port)), this.query && V.isObject(this.query) && Object.keys(this.query).length && (o = br.stringify(this.query));
      var a = this.search || o && "?" + o || "";
      return t && t.substr(-1) !== ":" && (t += ":"), this.slashes || (!t || Te[t]) && i !== false ? (i = "//" + (i || ""), r && r.charAt(0) !== "/" && (r = "/" + r)) : i || (i = ""), n && n.charAt(0) !== "#" && (n = "#" + n), a && a.charAt(0) !== "?" && (a = "?" + a), r = r.replace(/[?#]/g, function(s) {
        return encodeURIComponent(s);
      }), a = a.replace("#", "%23"), t + i + r + a + n;
    };
    function gf(e, t) {
      return qe(e, false, true).resolve(t);
    }
    D2.prototype.resolve = function(e) {
      return this.resolveObject(qe(e, false, true)).format();
    };
    function wf(e, t) {
      return e ? qe(e, false, true).resolveObject(t) : t;
    }
    D2.prototype.resolveObject = function(e) {
      if (V.isString(e)) {
        var t = new D2;
        t.parse(e, false, true), e = t;
      }
      for (var r = new D2, n = Object.keys(this), i = 0;i < n.length; i++) {
        var o = n[i];
        r[o] = this[o];
      }
      if (r.hash = e.hash, e.href === "")
        return r.href = r.format(), r;
      if (e.slashes && !e.protocol) {
        for (var a = Object.keys(e), s = 0;s < a.length; s++) {
          var u = a[s];
          u !== "protocol" && (r[u] = e[u]);
        }
        return Te[r.protocol] && r.hostname && !r.pathname && (r.path = r.pathname = "/"), r.href = r.format(), r;
      }
      if (e.protocol && e.protocol !== r.protocol) {
        if (!Te[e.protocol]) {
          for (var l = Object.keys(e), h2 = 0;h2 < l.length; h2++) {
            var c = l[h2];
            r[c] = e[c];
          }
          return r.href = r.format(), r;
        }
        if (r.protocol = e.protocol, !e.host && !mr[e.protocol]) {
          for (var R2 = (e.pathname || "").split("/");R2.length && !(e.host = R2.shift()); )
            ;
          e.host || (e.host = ""), e.hostname || (e.hostname = ""), R2[0] !== "" && R2.unshift(""), R2.length < 2 && R2.unshift(""), r.pathname = R2.join("/");
        } else
          r.pathname = e.pathname;
        if (r.search = e.search, r.query = e.query, r.host = e.host || "", r.auth = e.auth, r.hostname = e.hostname || e.host, r.port = e.port, r.pathname || r.search) {
          var d = r.pathname || "", p = r.search || "";
          r.path = d + p;
        }
        return r.slashes = r.slashes || e.slashes, r.href = r.format(), r;
      }
      var g = r.pathname && r.pathname.charAt(0) === "/", E2 = e.host || e.pathname && e.pathname.charAt(0) === "/", v = E2 || g || r.host && e.pathname, m2 = v, y2 = r.pathname && r.pathname.split("/") || [], R2 = e.pathname && e.pathname.split("/") || [], I = r.protocol && !Te[r.protocol];
      if (I && (r.hostname = "", r.port = null, r.host && (y2[0] === "" ? y2[0] = r.host : y2.unshift(r.host)), r.host = "", e.protocol && (e.hostname = null, e.port = null, e.host && (R2[0] === "" ? R2[0] = e.host : R2.unshift(e.host)), e.host = null), v = v && (R2[0] === "" || y2[0] === "")), E2)
        r.host = e.host || e.host === "" ? e.host : r.host, r.hostname = e.hostname || e.hostname === "" ? e.hostname : r.hostname, r.search = e.search, r.query = e.query, y2 = R2;
      else if (R2.length)
        y2 || (y2 = []), y2.pop(), y2 = y2.concat(R2), r.search = e.search, r.query = e.query;
      else if (!V.isNullOrUndefined(e.search)) {
        if (I) {
          r.hostname = r.host = y2.shift();
          var T2 = r.host && r.host.indexOf("@") > 0 ? r.host.split("@") : false;
          T2 && (r.auth = T2.shift(), r.host = r.hostname = T2.shift());
        }
        return r.search = e.search, r.query = e.query, (!V.isNull(r.pathname) || !V.isNull(r.search)) && (r.path = (r.pathname ? r.pathname : "") + (r.search ? r.search : "")), r.href = r.format(), r;
      }
      if (!y2.length)
        return r.pathname = null, r.search ? r.path = "/" + r.search : r.path = null, r.href = r.format(), r;
      for (var S = y2.slice(-1)[0], B = (r.host || e.host || y2.length > 1) && (S === "." || S === "..") || S === "", F = 0, L2 = y2.length;L2 >= 0; L2--)
        S = y2[L2], S === "." ? y2.splice(L2, 1) : S === ".." ? (y2.splice(L2, 1), F++) : F && (y2.splice(L2, 1), F--);
      if (!v && !m2)
        for (;F--; F)
          y2.unshift("..");
      v && y2[0] !== "" && (!y2[0] || y2[0].charAt(0) !== "/") && y2.unshift(""), B && y2.join("/").substr(-1) !== "/" && y2.push("");
      var Y = y2[0] === "" || y2[0] && y2[0].charAt(0) === "/";
      if (I) {
        r.hostname = r.host = Y ? "" : y2.length ? y2.shift() : "";
        var T2 = r.host && r.host.indexOf("@") > 0 ? r.host.split("@") : false;
        T2 && (r.auth = T2.shift(), r.host = r.hostname = T2.shift());
      }
      return v = v || r.host && y2.length, v && !Y && y2.unshift(""), y2.length ? r.pathname = y2.join("/") : (r.pathname = null, r.path = null), (!V.isNull(r.pathname) || !V.isNull(r.search)) && (r.path = (r.pathname ? r.pathname : "") + (r.search ? r.search : "")), r.auth = e.auth || r.auth, r.slashes = r.slashes || e.slashes, r.href = r.format(), r;
    };
    D2.prototype.parseHost = function() {
      var e = this.host, t = ff.exec(e);
      t && (t = t[0], t !== ":" && (this.port = t.substr(1)), e = e.substr(0, e.length - t.length)), e && (this.hostname = e);
    };
  });
  Hi = b2((ji) => {
    var ki = fi(), mf = ur(), bf = li(), _f = ci(), vf = Di(), j = ji;
    j.request = function(e, t) {
      typeof e == "string" ? e = vf.parse(e) : e = bf(e);
      var r = global.location.protocol.search(/^https?:$/) === -1 ? "http:" : "", n = e.protocol || r, i = e.hostname || e.host, o = e.port, a = e.path || "/";
      i && i.indexOf(":") !== -1 && (i = "[" + i + "]"), e.url = (i ? n + "//" + i : "") + (o ? ":" + o : "") + a, e.method = (e.method || "GET").toUpperCase(), e.headers = e.headers || {};
      var s = new ki(e);
      return t && s.on("response", t), s;
    };
    j.get = function(t, r) {
      var n = j.request(t, r);
      return n.end(), n;
    };
    j.ClientRequest = ki;
    j.IncomingMessage = mf.IncomingMessage;
    j.Agent = function() {
    };
    j.Agent.defaultMaxSockets = 4;
    j.globalAgent = new j.Agent;
    j.STATUS_CODES = _f;
    j.METHODS = ["CHECKOUT", "CONNECT", "COPY", "DELETE", "GET", "HEAD", "LOCK", "M-SEARCH", "MERGE", "MKACTIVITY", "MKCOL", "MOVE", "NOTIFY", "OPTIONS", "PATCH", "POST", "PROPFIND", "PROPPATCH", "PURGE", "PUT", "REPORT", "SEARCH", "SUBSCRIBE", "TRACE", "UNLOCK", "UNSUBSCRIBE"];
  });
  _r = Rr(Hi());
  iu = _r.default;
  ({ request: ou, get: au, ClientRequest: su, IncomingMessage: fu, Agent: uu, globalAgent: lu, STATUS_CODES: hu, METHODS: cu } = _r.default);
  /*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   */
  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
  /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
});

// src/polyfill.js
if (typeof Response === "undefined") {
  global.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}

// src/bucket.js
var { default: fs} = (()=>({}));

// node:path
var L = Object.create;
var b = Object.defineProperty;
var z = Object.getOwnPropertyDescriptor;
var D = Object.getOwnPropertyNames;
var T = Object.getPrototypeOf;
var R = Object.prototype.hasOwnProperty;
var _ = (f, e) => () => (e || f((e = { exports: {} }).exports, e), e.exports);
var E = (f, e) => {
  for (var r in e)
    b(f, r, { get: e[r], enumerable: true });
};
var C = (f, e, r, l) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let i of D(e))
      !R.call(f, i) && i !== r && b(f, i, { get: () => e[i], enumerable: !(l = z(e, i)) || l.enumerable });
  return f;
};
var A = (f, e, r) => (C(f, e, "default"), r && C(r, e, "default"));
var y = (f, e, r) => (r = f != null ? L(T(f)) : {}, C(e || !f || !f.__esModule ? b(r, "default", { value: f, enumerable: true }) : r, f));
var h = _((F, S) => {
  function c(f) {
    if (typeof f != "string")
      throw new TypeError("Path must be a string. Received " + JSON.stringify(f));
  }
  function w(f, e) {
    for (var r = "", l = 0, i = -1, s = 0, n, t = 0;t <= f.length; ++t) {
      if (t < f.length)
        n = f.charCodeAt(t);
      else {
        if (n === 47)
          break;
        n = 47;
      }
      if (n === 47) {
        if (!(i === t - 1 || s === 1))
          if (i !== t - 1 && s === 2) {
            if (r.length < 2 || l !== 2 || r.charCodeAt(r.length - 1) !== 46 || r.charCodeAt(r.length - 2) !== 46) {
              if (r.length > 2) {
                var a = r.lastIndexOf("/");
                if (a !== r.length - 1) {
                  a === -1 ? (r = "", l = 0) : (r = r.slice(0, a), l = r.length - 1 - r.lastIndexOf("/")), i = t, s = 0;
                  continue;
                }
              } else if (r.length === 2 || r.length === 1) {
                r = "", l = 0, i = t, s = 0;
                continue;
              }
            }
            e && (r.length > 0 ? r += "/.." : r = "..", l = 2);
          } else
            r.length > 0 ? r += "/" + f.slice(i + 1, t) : r = f.slice(i + 1, t), l = t - i - 1;
        i = t, s = 0;
      } else
        n === 46 && s !== -1 ? ++s : s = -1;
    }
    return r;
  }
  function J(f, e) {
    var r = e.dir || e.root, l = e.base || (e.name || "") + (e.ext || "");
    return r ? r === e.root ? r + l : r + f + l : l;
  }
  var g = { resolve: function() {
    for (var e = "", r = false, l, i = arguments.length - 1;i >= -1 && !r; i--) {
      var s;
      i >= 0 ? s = arguments[i] : (l === undefined && (l = process.cwd()), s = l), c(s), s.length !== 0 && (e = s + "/" + e, r = s.charCodeAt(0) === 47);
    }
    return e = w(e, !r), r ? e.length > 0 ? "/" + e : "/" : e.length > 0 ? e : ".";
  }, normalize: function(e) {
    if (c(e), e.length === 0)
      return ".";
    var r = e.charCodeAt(0) === 47, l = e.charCodeAt(e.length - 1) === 47;
    return e = w(e, !r), e.length === 0 && !r && (e = "."), e.length > 0 && l && (e += "/"), r ? "/" + e : e;
  }, isAbsolute: function(e) {
    return c(e), e.length > 0 && e.charCodeAt(0) === 47;
  }, join: function() {
    if (arguments.length === 0)
      return ".";
    for (var e, r = 0;r < arguments.length; ++r) {
      var l = arguments[r];
      c(l), l.length > 0 && (e === undefined ? e = l : e += "/" + l);
    }
    return e === undefined ? "." : g.normalize(e);
  }, relative: function(e, r) {
    if (c(e), c(r), e === r || (e = g.resolve(e), r = g.resolve(r), e === r))
      return "";
    for (var l = 1;l < e.length && e.charCodeAt(l) === 47; ++l)
      ;
    for (var i = e.length, s = i - l, n = 1;n < r.length && r.charCodeAt(n) === 47; ++n)
      ;
    for (var t = r.length, a = t - n, v = s < a ? s : a, u = -1, o = 0;o <= v; ++o) {
      if (o === v) {
        if (a > v) {
          if (r.charCodeAt(n + o) === 47)
            return r.slice(n + o + 1);
          if (o === 0)
            return r.slice(n + o);
        } else
          s > v && (e.charCodeAt(l + o) === 47 ? u = o : o === 0 && (u = 0));
        break;
      }
      var k = e.charCodeAt(l + o), P = r.charCodeAt(n + o);
      if (k !== P)
        break;
      k === 47 && (u = o);
    }
    var d = "";
    for (o = l + u + 1;o <= i; ++o)
      (o === i || e.charCodeAt(o) === 47) && (d.length === 0 ? d += ".." : d += "/..");
    return d.length > 0 ? d + r.slice(n + u) : (n += u, r.charCodeAt(n) === 47 && ++n, r.slice(n));
  }, _makeLong: function(e) {
    return e;
  }, dirname: function(e) {
    if (c(e), e.length === 0)
      return ".";
    for (var r = e.charCodeAt(0), l = r === 47, i = -1, s = true, n = e.length - 1;n >= 1; --n)
      if (r = e.charCodeAt(n), r === 47) {
        if (!s) {
          i = n;
          break;
        }
      } else
        s = false;
    return i === -1 ? l ? "/" : "." : l && i === 1 ? "//" : e.slice(0, i);
  }, basename: function(e, r) {
    if (r !== undefined && typeof r != "string")
      throw new TypeError('"ext" argument must be a string');
    c(e);
    var l = 0, i = -1, s = true, n;
    if (r !== undefined && r.length > 0 && r.length <= e.length) {
      if (r.length === e.length && r === e)
        return "";
      var t = r.length - 1, a = -1;
      for (n = e.length - 1;n >= 0; --n) {
        var v = e.charCodeAt(n);
        if (v === 47) {
          if (!s) {
            l = n + 1;
            break;
          }
        } else
          a === -1 && (s = false, a = n + 1), t >= 0 && (v === r.charCodeAt(t) ? --t === -1 && (i = n) : (t = -1, i = a));
      }
      return l === i ? i = a : i === -1 && (i = e.length), e.slice(l, i);
    } else {
      for (n = e.length - 1;n >= 0; --n)
        if (e.charCodeAt(n) === 47) {
          if (!s) {
            l = n + 1;
            break;
          }
        } else
          i === -1 && (s = false, i = n + 1);
      return i === -1 ? "" : e.slice(l, i);
    }
  }, extname: function(e) {
    c(e);
    for (var r = -1, l = 0, i = -1, s = true, n = 0, t = e.length - 1;t >= 0; --t) {
      var a = e.charCodeAt(t);
      if (a === 47) {
        if (!s) {
          l = t + 1;
          break;
        }
        continue;
      }
      i === -1 && (s = false, i = t + 1), a === 46 ? r === -1 ? r = t : n !== 1 && (n = 1) : r !== -1 && (n = -1);
    }
    return r === -1 || i === -1 || n === 0 || n === 1 && r === i - 1 && r === l + 1 ? "" : e.slice(r, i);
  }, format: function(e) {
    if (e === null || typeof e != "object")
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof e);
    return J("/", e);
  }, parse: function(e) {
    c(e);
    var r = { root: "", dir: "", base: "", ext: "", name: "" };
    if (e.length === 0)
      return r;
    var l = e.charCodeAt(0), i = l === 47, s;
    i ? (r.root = "/", s = 1) : s = 0;
    for (var n = -1, t = 0, a = -1, v = true, u = e.length - 1, o = 0;u >= s; --u) {
      if (l = e.charCodeAt(u), l === 47) {
        if (!v) {
          t = u + 1;
          break;
        }
        continue;
      }
      a === -1 && (v = false, a = u + 1), l === 46 ? n === -1 ? n = u : o !== 1 && (o = 1) : n !== -1 && (o = -1);
    }
    return n === -1 || a === -1 || o === 0 || o === 1 && n === a - 1 && n === t + 1 ? a !== -1 && (t === 0 && i ? r.base = r.name = e.slice(1, a) : r.base = r.name = e.slice(t, a)) : (t === 0 && i ? (r.name = e.slice(1, n), r.base = e.slice(1, a)) : (r.name = e.slice(t, n), r.base = e.slice(t, a)), r.ext = e.slice(n, a)), t > 0 ? r.dir = e.slice(0, t - 1) : i && (r.dir = "/"), r;
  }, sep: "/", delimiter: ":", win32: null, posix: null };
  g.posix = g;
  S.exports = g;
});
var m = {};
E(m, { default: () => q });
A(m, y(h()));
var q = y(h());

// src/bucket.js
var { default: fsp} = (()=>({}));
function bucket_default(root) {
  if (typeof root !== "string") {
    return root;
  }
  const absolute = (name) => {
    if (!name)
      throw new Error(`File name is required`);
    return q.resolve(q.join(root, name));
  };
  return {
    path: root,
    read: (name, type = "utf8") => {
      const fullPath = absolute(name);
      console.log(name, fullPath);
      return fsp.readFile(fullPath, type);
    },
    write: (name, value, type = "utf8") => {
      const fullPath = absolute(name);
      if (value) {
        return fsp.writeFile(fullPath, value, type).then(() => fullPath);
      } else {
        return fs.createWriteStream(fullPath);
      }
    }
  };
}

// src/helpers/define.js
function define(obj, key, cb) {
  Object.defineProperty(obj, key, {
    configurable: true,
    get() {
      const value = cb(obj);
      Object.defineProperty(obj, key, {
        configurable: false,
        writable: false,
        value
      });
      return obj[key];
    }
  });
}
// src/helpers/getMachine.js
var getRuntime = function() {
  if ("Bun" in globalThis)
    return "bun";
  if ("Deno" in globalThis)
    return "deno";
  if (globalThis.process?.versions?.node)
    return "node";
  return "unknown";
};
function getMachine() {
  return {
    runtime: getRuntime(),
    production: false
  };
}
// src/reply.js
var { default: fs2} = (()=>({}));
var Reply = function() {
};
Reply.prototype.res = { headers: {}, cookies: {} };
Reply.prototype.generateHeaders = function() {
  const cookies = Object.entries(this.res.cookies).map(([k, { value, path = "/" }]) => `${k}=${value};Path=${path}`).join(";");
  return { ...this.res.headers, "set-cookie": cookies };
};
Reply.prototype.status = function(status) {
  this.res.status = status;
  return this;
};
Reply.prototype.type = function(type) {
  if (!type)
    return this;
  this.res.headers["content-type"] = types_default[type.replace(/^\./)] || type;
  return this;
};
Reply.prototype.headers = function(headers) {
  if (!headers || typeof headers !== "object")
    return this;
  for (let key in headers) {
    this.res.headers[key] = headers[key];
  }
  return this;
};
Reply.prototype.cookies = function(cookies) {
  if (!cookies || typeof cookies !== "object")
    return this;
  for (let key in cookies) {
    if (typeof cookies[key] === "string") {
      this.res.cookies[key] = { value: cookies[key] };
    } else {
      this.res.cookies[key] = cookies[key];
    }
  }
  return this;
};
Reply.prototype.json = function(body) {
  return headers({ "content-type": "application/json" }).send(JSON.stringify(body));
};
Reply.prototype.file = async function(path) {
  const data = await fs2.readFile(path, "utf-8");
  if (data)
    return this.type(path.split(".").pop()).send(data);
  return status(404).send();
};
Reply.prototype.view = async function(path) {
  return async (ctx) => {
    console.log(ctx);
    if (!ctx.options.views) {
      throw new Error("Views not enabled");
    }
    const data = await ctx.options.views.read(path);
    if (data)
      return this.type(path.split(".").pop()).send(data);
    return status(404).send();
  };
};
Reply.prototype.send = function(body = "") {
  const { status = 200 } = this.res;
  if (typeof body === "string") {
    if (!this.res.headers["content-type"]) {
      const isHtml = body.startsWith("<");
      this.res.headers["content-type"] = isHtml ? "text/html" : "text/plain";
    }
    const headers = this.generateHeaders();
    return new Response(body, { status, headers });
  }
  return this.json(body);
};
var status = (...args) => new Reply().status(...args);
var type = (...args) => new Reply().type(...args);
var headers = (...args) => new Reply().headers(...args);
var cookies = (...args) => new Reply().cookies(...args);
var send = (...args) => new Reply().send(...args);
var json = (...args) => new Reply().json(...args);
var file = (...args) => new Reply().file(...args);
var view = (...args) => new Reply().view(...args);

// src/parseResponse.js
async function parseResponse(handler, ctx) {
  let out = await handler(ctx);
  if (!out && typeof out !== "string")
    return null;
  if (typeof out === "function") {
    out = await out(ctx);
  }
  if (typeof out === "number") {
    out = new Response(undefined, { status: out });
  }
  if (typeof out === "string") {
    const type2 = /\s*\</.test(out) ? "text/html" : "text/plain";
    out = new Response(out, { headers: { "content-type": type2 } });
  }
  if (out?.constructor === Object || Array.isArray(out)) {
    out = json(out);
  }
  if (!(out instanceof Response)) {
    throw new Error(`Invalid response type ${out}`);
  }
  if (ctx?.res?.headers) {
    for (let key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }
  return out;
}

// src/pathPattern.js
function pathPattern(pattern, path) {
  pattern = pattern.replace(/\/$/, "") || "/";
  path = path.replace(/\/$/, "") || "/";
  if (pattern === path)
    return {};
  const params = {};
  const pathParts = path.split("/").slice(1);
  const pattParts = pattern.split("/").slice(1);
  let allSame = true;
  for (let i = 0;i < Math.max(pathParts.length, pattParts.length); i++) {
    const patt = pattParts[i] || "";
    const part = pathParts[i] || "";
    const last = pattParts[pattParts.length - 1];
    const key = patt.replace(/^:/, "").replace(/\?$/, "");
    if (patt === part)
      continue;
    if (patt.endsWith("?") && !part)
      continue;
    if (patt.startsWith(":")) {
      params[key] = part;
      continue;
    }
    if (!patt && last === "*" && part || patt === "*" && part) {
      params["*"] = params["*"] || [];
      params["*"].push(part);
      continue;
    }
    allSame = false;
  }
  if (allSame)
    return params;
  return false;
}

// src/helpers/handleRequest.js
async function handleRequest(handlers, ctx) {
  for (let [matcher, ...cbs] of handlers[ctx.method]) {
    const match = pathPattern(matcher, ctx.url.pathname || "/");
    if (!match)
      continue;
    define(ctx.url, "params", () => match);
    for (let cb of cbs) {
      const out = await parseResponse(cb, ctx);
      if (out)
        return out;
    }
  }
  return Response("Not Found", { status: 404 });
}
// src/helpers/iterate.js
async function iterate(stream, cb) {
  const reader = stream.getReader();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done || !chunk.value)
      return;
    cb(chunk.value);
  }
}
// src/helpers/types.js
var types_default = {
  aac: "audio/aac",
  abw: "application/x-abiword",
  arc: "application/x-freearc",
  avif: "image/avif",
  avi: "video/x-msvideo",
  azw: "application/vnd.amazon.ebook",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  bz: "application/x-bzip",
  bz2: "application/x-bzip2",
  cda: "application/x-cdf",
  csh: "application/x-csh",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gz: "application/gzip",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/vnd.microsoft.icon",
  ics: "text/calendar",
  jar: "application/java-archive",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  mid: "audio/midi",
  midi: "audio/midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  mpkg: "application/vnd.apple.installer+xml",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  png: "image/png",
  pdf: "application/pdf",
  php: "application/x-httpd-php",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rar: "application/vnd.rar",
  rtf: "application/rtf",
  sh: "application/x-sh",
  svg: "image/svg+xml",
  tar: "application/x-tar",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  vsd: "application/vnd.visio",
  wav: "audio/wav",
  weba: "audio/webm",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xml: "application/xml",
  xul: "application/vnd.mozilla.xul+xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "7z": "application/x-7z-compressed"
};
// src/context/parseBody.js
var getBoundary = function(header) {
  if (!header)
    return null;
  var items = header.split(";");
  if (items)
    for (var j = 0;j < items.length; j++) {
      var item = new String(items[j]).trim();
      if (item.indexOf("boundary") >= 0) {
        var k = item.split("=");
        return new String(k[1]).trim();
      }
    }
  return null;
};
var getMatching = function(string, regex) {
  const matches = string.match(regex);
  if (!matches || matches.length < 2) {
    return "";
  }
  return matches[1];
};
var nanoid = (size = 12) => {
  let str = "";
  while (str.length < size + 2) {
    str += Math.round(Math.random() * 1e6).toString(16);
  }
  return str.slice(0, size);
};
var saveFile = async (name, value, bucket) => {
  const ext = name.split(".").pop();
  const id = `file-${nanoid(12)}.${ext}`;
  await bucket.write(id, value, "binary");
  return id;
};
async function parseBody(raw, contentType, bucket) {
  const rawData = typeof raw === "string" ? raw : await raw.text();
  if (!rawData)
    return {};
  if (!contentType || /text\/plain/.test(contentType)) {
    return rawData;
  }
  if (/application\/json/.test(contentType)) {
    return JSON.parse(rawData);
  }
  const boundary = getBoundary(contentType);
  if (!boundary)
    return null;
  const body = {};
  const rawDataArray = rawData.split(boundary);
  for (let item of rawDataArray) {
    const name = getMatching(item, /(?:name=")(.+?)(?:")/).trim().replace(/\[\]$/, "");
    if (!name)
      continue;
    let value = getMatching(item, /(?:\r\n\r\n)([\S\s]*)(?:\r\n--$)/);
    if (!value)
      continue;
    const filename = getMatching(item, /(?:filename=")(.*?)(?:")/).trim();
    if (filename) {
      value = await saveFile(filename, value, bucket);
    }
    if (body[name]) {
      if (!Array.isArray(body[name])) {
        body[name] = [body[name]];
      }
      body[name].push(value);
    } else {
      body[name] = value;
    }
  }
  return body;
}

// src/context/parseCookies.js
function parseCookies(cookies2) {
  if (!cookies2)
    return {};
  return Object.fromEntries(cookies2.split(/;\s*/).map((part) => {
    const [key, ...rest] = part.split("=");
    return [key, decodeURIComponent(rest.join("="))];
  }));
}

// src/context/node.js
var node_default = async (request, options = {}) => {
  const ctx = {};
  ctx.options = options;
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();
  ctx.headers = request.headers;
  define(ctx, "cookies", () => parseCookies(request.headers.cookie));
  const https = request.connection.encrypted ? "https" : "http";
  const host = ctx.headers.host || "localhost" + options.port;
  const path = request.url.replace(/\/$/, "") || "/";
  ctx.url = new URL(path, `${https}://${host}`);
  define(ctx.url, "query", (url) => Object.fromEntries(url.searchParams.entries()));
  if (request.body) {
    const type2 = ctx.headers["content-type"];
    ctx.body = await parseBody(request, type2, options.uploads);
  }
  return ctx;
};

// src/context/winter.js
var winter_default = async (request, options = {}) => {
  const ctx = {};
  ctx.options = options;
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();
  define(ctx, "headers", () => Object.fromEntries(request.headers.entries()));
  define(ctx, "cookies", () => parseCookies(request.headers.get("cookie")));
  ctx.url = new URL(request.url.replace(/\/$/, ""));
  define(ctx.url, "query", (url) => Object.fromEntries(url.searchParams.entries()));
  if (request.body) {
    const type2 = ctx.headers["content-type"];
    ctx.body = await parseBody(request, type2, options.uploads);
  }
  return ctx;
};
// src/router.js
function router() {
  if (!(this instanceof router)) {
    return new router;
  }
  this.handlers = {};
}
router.prototype.handle = function(name, middleware) {
  if (!this.handlers[name]) {
    this.handlers[name] = [];
  }
  this.handlers[name].push(middleware);
  return this;
};
router.prototype.socket = function(path, ...middleware) {
  return this.handle("socket", [path, ...middleware]);
};
router.prototype.get = function(path, ...middleware) {
  return this.handle("get", [path, ...middleware]);
};
router.prototype.head = function(path, ...middleware) {
  return this.handle("head", [path, ...middleware]);
};
router.prototype.post = function(path, ...middleware) {
  return this.handle("post", [path, ...middleware]);
};
router.prototype.put = function(path, ...middleware) {
  return this.handle("put", [path, ...middleware]);
};
router.prototype.patch = function(path, ...middleware) {
  return this.handle("patch", [path, ...middleware]);
};
router.prototype.del = function(path, ...middleware) {
  return this.handle("del", [path, ...middleware]);
};
router.prototype.options = function(path, ...middleware) {
  return this.handle("options", [path, ...middleware]);
};

// src/index.js
function server(options = {}) {
  if (!(this instanceof server)) {
    return new server(options);
  }
  this.platform = getMachine();
  this.handlers = {};
  options.views = options.views ? bucket_default(options.views) : null;
  options.public = options.public ? bucket_default(options.public) : null;
  options.uploads = options.uploads ? bucket_default(options.uploads) : null;
  this.options = options;
  this.sockets = [];
  this.websocket = {
    message: async (ws, body) => {
      this.handlers.socket?.filter((s) => s[0] === "message")?.map((s) => s[1]({ socket: ws, sockets: this.sockets, body }));
    },
    open: (ws) => this.sockets.push(ws),
    close: (ws) => this.sockets.splice(this.sockets.indexOf(ws), 1)
  };
  if (this.platform.runtime === "node") {
    (async () => {
      const http = await Promise.resolve().then(() => (init_http(), exports_http));
      http.createServer(async (request, response) => {
        const ctx = await node_default(request, options);
        ctx.platform = this.platform;
        const out = await handleRequest(this.handlers, ctx);
        response.writeHead(out.status || 200, { header: out.headers });
        if (out.body instanceof ReadableStream) {
          await iterate(out.body, (chunk) => response.write(chunk));
        } else {
          response.write(out.body || "");
        }
        response.end();
      }).listen(options.port || 3000);
    })();
  }
  this.fetch = async (request, env, fetchCtx) => {
    if (env?.upgrade(request))
      return;
    const ctx = await winter_default(request, options);
    ctx.platform = this.platform;
    return await handleRequest(this.handlers, ctx);
  };
}
server.prototype.handle = function(name, ...middleware) {
  if (!this.handlers[name]) {
    this.handlers[name] = [];
  }
  this.handlers[name].push(...middleware);
  return this;
};
server.prototype.socket = function(path, ...middleware) {
  return this.handle("socket", [path, ...middleware]);
};
server.prototype.get = function(path, ...middleware) {
  return this.handle("get", [path, ...middleware]);
};
server.prototype.head = function(path, ...middleware) {
  return this.handle("head", [path, ...middleware]);
};
server.prototype.post = function(path, ...middleware) {
  return this.handle("post", [path, ...middleware]);
};
server.prototype.put = function(path, ...middleware) {
  return this.handle("put", [path, ...middleware]);
};
server.prototype.patch = function(path, ...middleware) {
  return this.handle("patch", [path, ...middleware]);
};
server.prototype.del = function(path, ...middleware) {
  return this.handle("del", [path, ...middleware]);
};
server.prototype.options = function(path, ...middleware) {
  return this.handle("options", [path, ...middleware]);
};
server.prototype.use = function(...middleware) {
  let path = "*";
  if (typeof middleware[0] === "string" || middleware[0] instanceof RegExp) {
    path = middleware.shift();
  }
  this.handle("socket", [path, ...middleware]);
  this.handle("get", [path, ...middleware]);
  this.handle("head", [path, ...middleware]);
  this.handle("post", [path, ...middleware]);
  this.handle("put", [path, ...middleware]);
  this.handle("patch", [path, ...middleware]);
  this.handle("del", [path, ...middleware]);
  this.handle("options", [path, ...middleware]);
  return this;
};
server.prototype.router = function(basePath, router2) {
  basePath = "/" + basePath.replace(/^\//, "").replace(/\/$/, "") + "/";
  for (const method in router2.handlers) {
    const handlers = router2.handlers[method].map(([path, ...callbacks]) => [
      basePath + path.replace(/^\//, ""),
      ...callbacks
    ]);
    this.handle(method, ...handlers);
  }
  return this;
};
export {
  view,
  type,
  status,
  send,
  router,
  json,
  headers,
  file,
  server as default,
  cookies,
  Reply
};
