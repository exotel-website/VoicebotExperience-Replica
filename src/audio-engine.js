/**
 * AudioEngine — mic capture (PCM encoding via AudioWorklet) + bot audio playback.
 */
export class AudioEngine {
  constructor({ targetSampleRate = 16000, onPCMChunk }) {
    this.targetSampleRate = targetSampleRate;
    this.onPCMChunk = onPCMChunk;
    this.audioContext = null;
    this.playbackContext = null;
    this.stream = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.analyser = null;
    this._nextPlayTime = 0;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleSize: 16 },
    });
    this.audioContext = new AudioContext();
    this.playbackContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule('/pcm-processor.js');
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.sourceNode.connect(this.analyser);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor', {
      processorOptions: { targetSampleRate: this.targetSampleRate },
    });
    this.workletNode.port.onmessage = (e) => this.onPCMChunk(e.data);
    this.sourceNode.connect(this.workletNode);
  }

  playBase64PCM(base64Payload, incomingSampleRate) {
    const ctx = this.playbackContext || this.audioContext;
    if (!ctx) return;
    const binaryStr = atob(base64Payload);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;
    const rate = incomingSampleRate || this.targetSampleRate;
    const buffer = ctx.createBuffer(1, float32.length, rate);
    buffer.getChannelData(0).set(float32);
    const now = ctx.currentTime;
    if (this._nextPlayTime < now) this._nextPlayTime = now;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(this._nextPlayTime);
    this._nextPlayTime += buffer.duration;
  }

  clearPlaybackQueue() { this._nextPlayTime = 0; }

  getAnalyserData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  stop() {
    this.workletNode?.disconnect(); this.workletNode = null;
    this.sourceNode?.disconnect(); this.sourceNode = null;
    this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null;
    this.audioContext?.close(); this.audioContext = null;
    this.playbackContext?.close(); this.playbackContext = null;
    this._nextPlayTime = 0; this.analyser = null;
  }
}
