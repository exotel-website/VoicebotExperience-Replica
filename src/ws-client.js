/**
 * ExotelWSClient — sends Exotel protocol handshake and streams browser mic audio.
 */
export class ExotelWSClient {
  constructor({ onConnected, onStart, onMedia, onStop, onError, onClose, onLog }) {
    this.ws = null;
    this.streamSid = null;
    this.sampleRate = 16000;
    this._seqNum = 0;
    this._chunkNum = 0;
    this._readyToSend = false;
    this.callbacks = { onConnected, onStart, onMedia, onStop, onError, onClose, onLog };
  }

  _log(msg) { this.callbacks.onLog?.(msg); }

  async connect(url, sampleRate = 16000) {
    let wssUrl = url.trim();
    this.sampleRate = sampleRate;

    if (wssUrl.startsWith('https://') || wssUrl.startsWith('http://')) {
      try {
        const proxyUrl = `/api/resolve-ws?url=${encodeURIComponent(wssUrl)}`;
        this._log('Resolving endpoint...');
        const resp = await fetch(proxyUrl);
        const text = await resp.text();
        const data = JSON.parse(text);
        if (data.url) { wssUrl = data.url; }
        else { throw new Error(data.error || 'No url field'); }
      } catch (err) {
        this.callbacks.onError?.(`Failed to resolve: ${err.message}`);
        return false;
      }
    }

    if (!wssUrl.startsWith('wss://') && !wssUrl.startsWith('ws://')) wssUrl = 'wss://' + wssUrl;

    try {
      const urlObj = new URL(wssUrl);
      if (!urlObj.searchParams.has('sample-rate')) {
        urlObj.searchParams.set('sample-rate', sampleRate.toString());
        wssUrl = urlObj.toString();
      }
    } catch { wssUrl += (wssUrl.includes('?') ? '&' : '?') + `sample-rate=${sampleRate}`; }

    this._log(`Connecting: ${wssUrl}`);

    try { this.ws = new WebSocket(wssUrl); }
    catch (err) { this.callbacks.onError?.(`WebSocket failed: ${err.message}`); return false; }

    return new Promise((resolve) => {
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; clearTimeout(timeout); resolve(v); } };
      const timeout = setTimeout(() => { this._log('Timeout'); settle(false); }, 10000);

      this.ws.onopen = () => {
        this._log('Connected');
        this._seqNum = 0; this._chunkNum = 0;
        this.streamSid = 'browser-' + Date.now().toString(36);
        this._send({ event: 'connected', protocol: 'Call', version: '1.0.0' });
        this._send({
          event: 'start', sequence_number: ++this._seqNum, stream_sid: this.streamSid,
          start: {
            stream_sid: this.streamSid, call_sid: 'browser-call-' + Date.now().toString(36),
            account_sid: 'browser', from: 'browser-webrtc', to: 'voicebot',
            custom_parameters: {},
            media_format: { encoding: 'audio/x-l16', sample_rate: sampleRate, bit_rate: sampleRate * 16 },
          },
        });
        this._readyToSend = true;
        this.callbacks.onConnected?.();
        settle(true);
      };

      this.ws.onmessage = (event) => {
        try { this._handleMessage(JSON.parse(event.data)); } catch {}
      };
      this.ws.onerror = () => { this.callbacks.onError?.('Connection error'); settle(false); };
      this.ws.onclose = (e) => { this.callbacks.onClose?.(e.code, e.reason); settle(false); };
    });
  }

  _send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify(obj)); } catch {}
  }

  _handleMessage(msg) {
    switch (msg.event) {
      case 'connected': break;
      case 'start': {
        const sid = msg.start?.stream_sid || msg.stream_sid;
        if (sid) this.streamSid = sid;
        if (msg.start?.media_format?.sample_rate) this.sampleRate = parseInt(msg.start.media_format.sample_rate, 10);
        this._readyToSend = true;
        this.callbacks.onStart?.(msg);
        break;
      }
      case 'media': this.callbacks.onMedia?.(msg.media?.payload, msg.media); break;
      case 'stop': this.callbacks.onStop?.(msg.stop?.reason); break;
      default: break;
    }
  }

  sendAudio(pcmBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this._readyToSend) return;
    const uint8 = new Uint8Array(pcmBuffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    this._send({
      event: 'media', sequence_number: ++this._seqNum, stream_sid: this.streamSid,
      media: { chunk: ++this._chunkNum, timestamp: String(this._chunkNum * 100), payload: btoa(binary) },
    });
  }

  sendClear() { this._send({ event: 'clear', stream_sid: this.streamSid }); }

  disconnect() {
    if (this.ws) {
      this._send({ event: 'stop', sequence_number: ++this._seqNum, stream_sid: this.streamSid, stop: { reason: 'user_disconnect' } });
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.streamSid = null; this._seqNum = 0; this._chunkNum = 0;
  }

  get isConnected() { return this.ws && this.ws.readyState === WebSocket.OPEN; }
}
