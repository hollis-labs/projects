// chess-tutor serves the chess tutor: the built page, and an agent host for it to talk to.
// It is a small local application: one person, no accounts, bound to this machine.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/hollis-labs/ade-core/go/agenthost"
)

func env(name, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(name)); v != "" {
		return v
	}
	return fallback
}

func main() {
	addr := flag.String("addr", env("CHESS_TUTOR_ADDR", "127.0.0.1:8791"), "where to listen; this machine only unless -allow-remote")
	web := flag.String("web", env("CHESS_TUTOR_WEB", "frontend/dist"), "the built page")
	data := flag.String("data", env("CHESS_TUTOR_DATA", "data"), "where the conversation is kept")
	model := flag.String("model", env("CHESS_TUTOR_MODEL", ""), "the model's name or the gateway's alias for it")
	gateway := flag.String("gateway", env("CHESS_TUTOR_GATEWAY", ""), "an Anthropic-compatible base URL: requests go to <url>/v1/messages")
	keyFile := flag.String("key-file", env("CHESS_TUTOR_KEY_FILE", ""), "a file holding the gateway's key")
	remote := flag.Bool("allow-remote", false, "listen beyond this machine (there are no accounts: anyone who can reach it can use it)")
	flag.Parse()
	if err := run(*addr, *web, *data, *model, *gateway, *keyFile, *remote); err != nil {
		fmt.Fprintln(os.Stderr, "chess-tutor:", err)
		os.Exit(1)
	}
}

func run(addr, web, data, model, gateway, keyFile string, remote bool) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("-addr: %w", err)
	}
	if ip := net.ParseIP(host); !remote && host != "localhost" && (ip == nil || !ip.IsLoopback()) {
		return errors.New("-addr is not this machine; there are no accounts here, so pass -allow-remote if you mean it")
	}
	if _, err := os.Stat(filepath.Join(web, "index.html")); err != nil {
		return fmt.Errorf("the page is not built at %s (run npm run build in frontend): %w", web, err)
	}
	if err := os.MkdirAll(data, 0o700); err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	store, err := agenthost.OpenSQLite(ctx, filepath.Join(data, "agent.db"))
	if err != nil {
		return fmt.Errorf("the conversation store: %w", err)
	}
	defer func() { _ = store.Close() }()
	// With no model configured the page still works by hand, and says no model is connected.
	agent := agenthost.New(agenthost.Config{Model: model, BaseURL: gateway, KeyFile: keyFile, System: tutorPrompt}, store)
	defer agent.Close()

	mux := http.NewServeMux()
	// One person, at this machine.
	h := agent.Handler("/api/agent", func(*http.Request) (string, error) { return "local", nil })
	mux.Handle("/api/agent", h)
	mux.Handle("/api/agent/", h)
	mux.Handle("/", http.FileServer(http.Dir(web)))

	srv := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		<-ctx.Done()
		shut, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shut)
	}()
	slog.Info("chess tutor listening", "url", "http://"+addr, "model", model, "model_connected", model != "" && gateway != "" && keyFile != "")
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
