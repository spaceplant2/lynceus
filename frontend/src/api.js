export async function fetchDevices() {
  const response = await fetch('/api/devices');
  if (!response.ok) {
    throw new Error(`Failed to fetch devices: ${response.statusText}`);
  }
  return response.json();
}
