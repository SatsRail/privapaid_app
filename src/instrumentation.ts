export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    const { validateEnv } = await import("@/lib/env-check");
    validateEnv();

    // OpenTelemetry — opt-in via OTEL_EXPORTER_OTLP_ENDPOINT env var
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      const { NodeSDK } = await import("@opentelemetry/sdk-node");
      const { getNodeAutoInstrumentations } = await import(
        "@opentelemetry/auto-instrumentations-node"
      );
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-http"
      );
      const { OTLPMetricExporter } = await import(
        "@opentelemetry/exporter-metrics-otlp-http"
      );
      const { PeriodicExportingMetricReader } = await import(
        "@opentelemetry/sdk-metrics"
      );

      const sdk = new NodeSDK({
        serviceName: process.env.OTEL_SERVICE_NAME || "privapaid",
        traceExporter: new OTLPTraceExporter(),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis: 60_000,
        }),
        instrumentations: [
          getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-fs": { enabled: false },
          }),
        ],
      });

      sdk.start();
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
