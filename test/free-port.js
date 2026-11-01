// Freier Port vom Betriebssystem statt eines zufälligen Wertes aus einem festen Bereich:
// parallele Testläufe (auch mehrere Arbeitskopien oder ein Entwicklungsserver) stoßen nicht mehr zusammen.
import { createServer } from 'node:net';

export const freePort = () => new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
