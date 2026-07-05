const DEVICE_ID_KEY = "wise-device-id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const arr = new Uint8Array(1);
      crypto.getRandomValues(arr);
      r = arr[0] % 16;
    }
    const rInt = r | 0;
    const v = c === "x" ? rInt : (rInt & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function useDeviceId(): string {
  return getDeviceId();
}
