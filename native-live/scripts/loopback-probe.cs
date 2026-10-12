// WASAPI shared-mode playback loopback. No microphone is opened and no raw
// audio is retained. Only the synthetic 697Hz test tone's amplitude is emitted.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

namespace FrommBenchmark {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] internal class MMDeviceEnumerator {}
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  internal interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int flow, int mask, out IntPtr devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
    int GetDevice(string id, out IMMDevice device);
    int RegisterEndpointNotificationCallback(IntPtr callback);
    int UnregisterEndpointNotificationCallback(IntPtr callback);
  }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  internal interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, uint context, IntPtr activation, [MarshalAs(UnmanagedType.IUnknown)] out object result);
    int OpenPropertyStore(int access, out IntPtr properties);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetState(out int state);
  }
  [ComImport, Guid("1CB9AD4C-DBFA-4C32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  internal interface IAudioClient {
    [PreserveSig] int Initialize(int shareMode, uint flags, long duration, long periodicity, IntPtr format, ref Guid session);
    int GetBufferSize(out uint frames);
    int GetStreamLatency(out long latency);
    int GetCurrentPadding(out uint padding);
    int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
    [PreserveSig] int GetMixFormat(out IntPtr format);
    int GetDevicePeriod(out long normal, out long minimum);
    [PreserveSig] int Start();
    [PreserveSig] int Stop();
    int Reset();
    int SetEventHandle(IntPtr handle);
    [PreserveSig] int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
  }
  [ComImport, Guid("C8ADBD64-E71E-48A0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  internal interface IAudioCaptureClient {
    [PreserveSig] int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
    [PreserveSig] int ReleaseBuffer(uint frames);
    [PreserveSig] int GetNextPacketSize(out uint frames);
  }
  public sealed class ProbeResult {
    public string stage = "audio-loopback-complete";
    public bool hardwareAudioVerified;
    public bool toneStoppedAfterLeave;
    public double peakToneAmplitude;
    public int toneWindows;
    public int sampleWindows;
    public int sampleRate;
    public int channels;
    public bool synthetic = true;
    public bool mediaVerified = false;
  }
  public sealed class LoopbackProbe : IDisposable {
    private IMMDeviceEnumerator enumerator;
    private IMMDevice device;
    private IAudioClient client;
    private IAudioCaptureClient capture;
    private int rate, channels, blockAlign, bits;
    private bool isFloat, disposed;
    private static readonly Guid FloatFormat = new Guid("00000003-0000-0010-8000-00AA00389B71");
    private static void Check(int code) { if (code < 0) Marshal.ThrowExceptionForHR(code); }
    public LoopbackProbe() {
      try {
        enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
        Check(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
        Guid iid = typeof(IAudioClient).GUID;
        object instance; Check(device.Activate(ref iid, 23, IntPtr.Zero, out instance)); client = (IAudioClient)instance;
        IntPtr format; Check(client.GetMixFormat(out format));
        try {
          ushort tag = (ushort)Marshal.ReadInt16(format, 0);
          channels = (ushort)Marshal.ReadInt16(format, 2); rate = Marshal.ReadInt32(format, 4);
          blockAlign = (ushort)Marshal.ReadInt16(format, 12); bits = (ushort)Marshal.ReadInt16(format, 14);
          isFloat = tag == 3 || (tag == 65534 && (Guid)Marshal.PtrToStructure(IntPtr.Add(format, 24), typeof(Guid)) == FloatFormat);
          if ((isFloat && bits != 32) || (!isFloat && bits != 16 && bits != 24 && bits != 32)) throw new NotSupportedException();
          Guid session = Guid.Empty; Check(client.Initialize(0, 0x00020000, 10000000, 0, format, ref session));
        } finally { Marshal.FreeCoTaskMem(format); }
        iid = typeof(IAudioCaptureClient).GUID; Check(client.GetService(ref iid, out instance)); capture = (IAudioCaptureClient)instance;
        Check(client.Start());
      } catch { Dispose(); throw; }
    }
    public ProbeResult Measure(int seconds) {
      var result = new ProbeResult { sampleRate = rate, channels = channels };
      var windows = new List<bool>(); var clock = Stopwatch.StartNew();
      double sumSquares = 0, real = 0, imaginary = 0; long samples = 0; int nextSecond = 1;
      while (clock.Elapsed.TotalSeconds < seconds) {
        uint packet; Check(capture.GetNextPacketSize(out packet));
        while (packet > 0) {
          IntPtr pointer; uint frames, flags; ulong position, qpc;
          Check(capture.GetBuffer(out pointer, out frames, out flags, out position, out qpc));
          try {
            byte[] bytes = null;
            if ((flags & 2) == 0) { bytes = new byte[frames * blockAlign]; Marshal.Copy(pointer, bytes, 0, bytes.Length); }
            for (int f = 0; f < frames; f++) {
              double value = 0;
              if (bytes != null) {
                int offset = f * blockAlign;
                if (isFloat) value = BitConverter.ToSingle(bytes, offset);
                else if (bits == 16) value = BitConverter.ToInt16(bytes, offset) / 32768.0;
                else if (bits == 32) value = BitConverter.ToInt32(bytes, offset) / 2147483648.0;
                else { int pcm = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16); if ((pcm & 0x800000) != 0) pcm |= unchecked((int)0xff000000); value = pcm / 8388608.0; }
              }
              if (double.IsNaN(value) || double.IsInfinity(value)) value = 0;
              double phase = 2 * Math.PI * 697 * samples / rate;
              sumSquares += value * value; real += value * Math.Cos(phase); imaginary += value * Math.Sin(phase); samples++;
            }
          } finally { Check(capture.ReleaseBuffer(frames)); }
          Check(capture.GetNextPacketSize(out packet));
        }
        if (clock.Elapsed.TotalSeconds >= nextSecond) {
          double rms = samples > 0 ? Math.Sqrt(sumSquares / samples) : 0;
          double tone = samples > 0 ? 2 * Math.Sqrt(real * real + imaginary * imaginary) / samples : 0;
          bool detected = tone > 0.0001 && tone > rms * 0.1;
          windows.Add(detected); if (detected) result.toneWindows++;
          result.peakToneAmplitude = Math.Max(result.peakToneAmplitude, tone);
          Console.WriteLine(string.Format(CultureInfo.InvariantCulture, "{{\"stage\":\"audio-loopback-sample\",\"elapsedSeconds\":{0},\"toneAmplitude\":{1:F7},\"rms\":{2:F7},\"toneDetected\":{3}}}", nextSecond, tone, rms, detected ? "true" : "false"));
          samples = 0; real = imaginary = sumSquares = 0; nextSecond++;
        }
        Thread.Sleep(10);
      }
      result.sampleWindows = windows.Count;
      result.hardwareAudioVerified = result.toneWindows >= 20;
      result.toneStoppedAfterLeave = windows.Count >= 3 && !windows[windows.Count - 1] && !windows[windows.Count - 2] && !windows[windows.Count - 3];
      return result;
    }
    public void Dispose() {
      if (disposed) return; disposed = true;
      if (client != null) { try { client.Stop(); } catch {} }
      foreach (object item in new object[] { capture, client, device, enumerator }) if (item != null && Marshal.IsComObject(item)) Marshal.ReleaseComObject(item);
    }
  }
}
