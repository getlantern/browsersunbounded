package main

// This is a sketch for sending metrics to Google Cloud Platform. It was eventually discovered that
// such a thing isn't actually supported as long as the egress server is hosted on Google Cloud Run:
//
// https://cloud.google.com/run/docs/monitoring#custom-metrics
//
// Maybe this code will be useful if we migrate the egress server to a different hosting product.

import (
  "context"
  "log"

  "go.opentelemetry.io/otel/attribute"
  // "go.opentelemetry.io/otel/metric/instrument"
  "go.opentelemetry.io/otel/sdk/metric"

  mexporter "github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/metric"
)

func testMetrics() {
  // TODO: get this from the environment
  projectID := "broflake"

  opts := []mexporter.Option{mexporter.WithProjectID(projectID)}

  exporter, err := mexporter.New(opts...)
  if err != nil {
    log.Printf("Failed to create Otel exporter: %v\n", err)
  }

  // Init a MeterProvider that periodically exports to the GCP exporter
  provider := metric.NewMeterProvider(metric.WithReader(metric.NewPeriodicReader(exporter)))
  ctx := context.Background()
  defer provider.ForceFlush(ctx)
  defer provider.Shutdown(ctx)

  // Start meter
  // This must be named according to Google's conventions, otherwise things fail silently. The
  // requirements are confusing and it's unclear that the name used here makes any sense. See: 
  // https://cloud.google.com/monitoring/api/v3/naming-conventions
  meter := provider.Meter("custom.googleapis.com/egress")
  
  // This is the name of your counter as it will appear in Google's "Metrics diagnostics" panel
  counter, err := meter.Int64Counter("deployment-test-hello")
  if err != nil {
    log.Printf("Failed to create metrics counter: %v", err)
  }

  labels := []attribute.KeyValue{attribute.Key("key").String("value")}

  counter.Add(ctx, 123, labels...)
  log.Printf("Added to the counter...\n")
}
