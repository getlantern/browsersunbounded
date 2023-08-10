//go:build wasm

package otel

// CollectAndSendNATBehaviorTelemetry is a noop for wasm build targets, because OpenTelemetry's Go
// implementation abuses the call stack in ways that mobile Safari doesn't appreciate
func CollectAndSendNATBehaviorTelemetry(srvs []string, name string) {

}
