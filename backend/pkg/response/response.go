package response

import (
	"encoding/json"
	"net/http"
)

// JSON encodes v as JSON and writes it to w with the given HTTP status code.
// It always sets Content-Type to application/json.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
	}
}

// Error writes a standard JSON error envelope.
//
//	{"error": "<message>"}
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// NoContent writes a 204 with no body.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
