// Tests only. Newer Node versions reject jsdom's AbortSignal inside Node's own Request,
// which breaks React Router's data router in tests. The app itself is not affected.
// We drop the signal from Request in the test environment; nothing here aborts requests.
const NodeRequest = globalThis.Request;

class TestRequest extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init && init.signal) {
      const { signal: _signal, ...rest } = init;
      super(input, rest);
    } else {
      super(input, init);
    }
  }
}

globalThis.Request = TestRequest as typeof Request;
