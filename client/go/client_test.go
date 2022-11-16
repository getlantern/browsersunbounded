package main

import (
	"io"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestDomainFronting runs a functional test of domain fronting a request using
// our global config
func TestDomainFronting(t *testing.T) {
	cl, err := initDefaultHTTPClient()
	require.NoError(t, err)
	require.NotNil(t, cl)

	t.Run("Assert a domain in the provider list would work", func(t *testing.T) {
		resp, err := cl.Get("http://geo.getiantem.org/lookup/95.90.211.100")
		require.NoError(t, err)
		require.NotNil(t, resp)
		defer resp.Body.Close()
		require.Equal(t, 200, resp.StatusCode)
		b, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		require.Contains(t, string(b), "Germany")
	})

	t.Run("Assert a domain NOT in the provider list would NOT work", func(t *testing.T) {
		resp, err := cl.Get("http://bbc.co.uk")
		require.Contains(t, err.Error(), "No domain fronting mapping")
		require.Nil(t, resp)
	})
}
