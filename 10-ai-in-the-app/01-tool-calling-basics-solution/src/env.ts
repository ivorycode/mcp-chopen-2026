// Lädt ausschließlich die lokale .env dieses eigenständigen Projekts.
// Node 22.18+ bringt process.loadEnvFile mit, dotenv ist nicht nötig.

try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // keine .env: Variablen müssen aus der Shell kommen
}
