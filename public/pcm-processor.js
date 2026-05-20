/**
 * AudioWorklet processor — captures mic PCM, downsamples, posts Int16 chunks.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._targetRate = options.processorOptions?.targetSampleRate || 16000;
    this._nativeRate = sampleRate;
    this._resampleRatio = this._nativeRate / this._targetRate;
    this._buffer = [];
    this._flushSize = Math.floor(this._targetRate * 0.1);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const float32 = input[0];

    if (this._resampleRatio <= 1) {
      for (let i = 0; i < float32.length; i++) this._buffer.push(float32[i]);
    } else {
      const step = this._resampleRatio;
      for (let i = 0; i < float32.length; i += step) {
        const idx = Math.floor(i);
        const frac = i - idx;
        if (idx + 1 < float32.length) {
          this._buffer.push(float32[idx] * (1 - frac) + float32[idx + 1] * frac);
        } else if (idx < float32.length) {
          this._buffer.push(float32[idx]);
        }
      }
    }

    while (this._buffer.length >= this._flushSize) {
      const samples = this._buffer.splice(0, this._flushSize);
      const int16 = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
