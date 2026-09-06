// Lädt ausschließlich die lokale .env dieses eigenständigen Projekts.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // keine .env vorhanden
}
