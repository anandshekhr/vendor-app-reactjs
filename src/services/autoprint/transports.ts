/**
 * Ways to reach a printer from the browser.
 *
 * - browser: the normal print dialog via a hidden iframe. Works with any printer the computer knows. To print without
 *   the dialog, start Chrome/Edge with `--kiosk-printing` (prints straight to the default printer).
 * - usb: WebUSB to an ESC/POS thermal printer -- no dialog. Chrome/Edge on desktop and Chrome on Android.
 * - serial: Web Serial to an ESC/POS printer on a COM port, including Bluetooth printers paired as a serial port.
 *   Chrome/Edge on desktop.
 *
 * The device is picked once in Printer settings (a browser permission prompt); after that the browser remembers it
 * and `getDevices()` / `getPorts()` reconnect without asking.
 */

// Minimal typings for WebUSB / Web Serial (not in TypeScript's DOM lib).
interface UsbEndpoint { direction: 'in' | 'out'; type: string; endpointNumber: number }
interface UsbAlternate { interfaceClass: number; endpoints: UsbEndpoint[] }
interface UsbInterface { interfaceNumber: number; alternate: UsbAlternate | null; alternates: UsbAlternate[]; claimed: boolean }
interface UsbConfiguration { interfaces: UsbInterface[] }
interface UsbDevice {
  productName?: string;
  manufacturerName?: string;
  opened: boolean;
  configuration: UsbConfiguration | null;
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: BufferSource): Promise<unknown>;
}
interface UsbApi {
  requestDevice(o: { filters: object[] }): Promise<UsbDevice>;
  getDevices(): Promise<UsbDevice[]>;
}
interface SerialPortLike {
  readable: unknown;
  writable: WritableStream<Uint8Array> | null;
  open(o: { baudRate: number }): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}
interface SerialApi {
  requestPort(o?: object): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

const nav = () => navigator as Navigator & { usb?: UsbApi; serial?: SerialApi };

export const supportsUsb = () => typeof navigator !== 'undefined' && Boolean(nav().usb);
export const supportsSerial = () => typeof navigator !== 'undefined' && Boolean(nav().serial);

export class PrinterNotConnected extends Error {
  constructor(message = 'No printer connected. Open Printer settings and connect it.') {
    super(message);
    this.name = 'PrinterNotConnected';
  }
}

// ─── Browser print dialog ───────────────────────────────────────────────────

export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    frame.srcdoc = html;
    frame.onload = () => {
      try {
        const win = frame.contentWindow!;
        win.focus();
        win.print();
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        // Give the dialog time to snapshot the page before removing it.
        setTimeout(() => frame.remove(), 60_000);
      }
    };
    document.body.appendChild(frame);
  });
}

// ─── USB ─────────────────────────────────────────────────────────────────────

let usbDevice: UsbDevice | null = null;
let usbEndpoint: number | null = null;

function usbLabel(d: UsbDevice) {
  return [d.manufacturerName, d.productName].filter(Boolean).join(' ') || 'USB printer';
}

async function openUsb(device: UsbDevice) {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  for (const iface of device.configuration!.interfaces) {
    const alt = iface.alternate ?? iface.alternates[0];
    const out = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
    if (out) {
      if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
      usbDevice = device;
      usbEndpoint = out.endpointNumber;
      return;
    }
  }
  throw new PrinterNotConnected('This USB device has no printer output. Pick the thermal printer.');
}

/** Ask the user to pick a USB printer (needs a click). Returns its name. */
export async function connectUsb(): Promise<string> {
  const usb = nav().usb;
  if (!usb) throw new PrinterNotConnected('This browser cannot use USB printers. Use Chrome or Edge.');
  // Class 7 = printer. Many cheap thermal printers report a vendor class instead, so allow any device.
  const device = await usb.requestDevice({ filters: [] });
  await openUsb(device);
  return usbLabel(device);
}

async function ensureUsb(): Promise<void> {
  if (usbDevice?.opened && usbEndpoint !== null) return;
  const usb = nav().usb;
  const known = usb ? await usb.getDevices() : [];
  if (!known.length) throw new PrinterNotConnected();
  await openUsb(known[0]);
}

export async function writeUsb(data: Uint8Array) {
  await ensureUsb();
  await usbDevice!.transferOut(usbEndpoint!, data);
}

// ─── Serial / Bluetooth ─────────────────────────────────────────────────────

let serialPort: SerialPortLike | null = null;

async function openSerial(port: SerialPortLike, baudRate: number) {
  if (!port.writable) await port.open({ baudRate });
  serialPort = port;
}

export async function connectSerial(baudRate: number): Promise<string> {
  const serial = nav().serial;
  if (!serial) throw new PrinterNotConnected('This browser cannot use serial/Bluetooth printers. Use Chrome or Edge on a computer.');
  const port = await serial.requestPort();
  await openSerial(port, baudRate);
  const info = port.getInfo();
  return info.usbVendorId ? `Serial printer (${info.usbVendorId.toString(16)}:${(info.usbProductId ?? 0).toString(16)})` : 'Serial / Bluetooth printer';
}

export async function writeSerial(data: Uint8Array, baudRate: number) {
  if (!serialPort?.writable) {
    const serial = nav().serial;
    const known = serial ? await serial.getPorts() : [];
    if (!known.length) throw new PrinterNotConnected();
    await openSerial(known[0], baudRate);
  }
  const writer = serialPort!.writable!.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}
