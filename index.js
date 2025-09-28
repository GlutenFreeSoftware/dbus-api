import app from './src/app.js';
import { config } from './src/config/environment.js';

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`🚌 dbus API Server started`);
    console.log(`📍 Environment: ${config.nodeEnv}`);
    console.log(`🌐 Listening on: http://localhost:${PORT}`);
});
