package common

import (
	"log"
	"os"
	"sync"
)

var (
	debugLogger = log.New(os.Stderr, "", log.LstdFlags)
	logMx       sync.RWMutex
)

// Override the Logger used by BU for debug messages
func SetDebugLogger(l *log.Logger) {
	logMx.Lock()
	defer logMx.Unlock()
	debugLogger = l
}

// Log a debug level message
func Debugf(format string, args ...interface{}) {
	logMx.RLock()
	l := debugLogger
	logMx.RUnlock()
	l.Printf(format+"\n", args...)
}

// Log a debug level message
func Debug(msg interface{}) {
	logMx.RLock()
	l := debugLogger
	logMx.RUnlock()
	l.Println(msg)
}
