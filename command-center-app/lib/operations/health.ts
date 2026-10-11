export type RuntimeHealth = {
  status: "ok";
  service: "command-center";
  timestamp: string;
  uptimeSeconds: number;
  nodeEnv: string;
};

export function runtimeHealthSnapshot(): RuntimeHealth {
  return {
    status: "ok",
    service: "command-center",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeEnv: process.env.NODE_ENV ?? "development"
  };
}
