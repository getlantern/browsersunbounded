//go:build !wasm

package otel

import (
	"context"

	goNATs "github.com/enobufs/go-nats/nats"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

func buTracer() trace.Tracer {
	return otel.GetTracerProvider().Tracer("unbounded")
}

// collectAndSendNATBehaviorTelemetry attempts to perform NAT behavior discovery, trying one batch
// of STUN servers, and sends the results in an attribute-rich Otel trace under name 'name'
func CollectAndSendNATBehaviorTelemetry(srvs []string, name string) {
	var res *goNATs.DiscoverResult
	attrs := trace.WithAttributes()

	for _, s := range srvs {
		n, err := goNATs.NewNATS(&goNATs.Config{
			Server:  s[5:], // XXX: hackily remove the leading 'stun:' from the STUN servers in the ProxyConfig
			Verbose: false,
		})

		if err != nil {
			continue
		}

		res, err = n.Discover()

		if err == nil {
			attrs = trace.WithAttributes(
				attribute.Bool("nat_is_natted", res.IsNatted),
				attribute.String("nat_mapping_behavior", res.MappingBehavior.String()),
				attribute.String("nat_filtering_behavior", res.FilteringBehavior.String()),
				attribute.Bool("nat_port_preservation", res.PortPreservation),
				attribute.String("nat_type", res.NATType),
				attribute.String("nat_external_ip", res.ExternalIP),
			)
			break
		}
	}

	_, span := buTracer().Start(context.Background(), name, attrs)
	span.End()
}
