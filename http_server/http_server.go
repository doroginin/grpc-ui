package http_server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/komly/grpc-ui/proto"
	"github.com/komly/grpc-ui/reflection"
)

// New create HTTPServer on `addr`
// if `devMode=true` then we use localFS instead of memFS
func New(addr string, devMode bool) *HTTPServer {
	mux := http.NewServeMux()

	s := &HTTPServer{
		addr: addr,
		mux:  mux,
	}

	mux.HandleFunc("/api/info", s.infoHandler)
	mux.HandleFunc("/api/invoke", s.invokeHandler)

	mux.Handle("/static/", http.FileServer(FS(devMode)))
	mux.HandleFunc("/", s.indexHandler)

	return s
}

type HTTPServer struct {
	addr       string
	targetAddr string
	mux        *http.ServeMux
}

type InvokeReq struct {
	Addr        string             `json:"addr"`
	ServiceName string             `json:"service_name"`
	PackageName string             `json:"package_name"`
	MethodName  string             `json:"method_name"`
	GRPCArgs    []proto.FieldValue `json:"grpc_args"`
}

type InvokeResp struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data"`
	Error  string      `json:"error"`
}

type InvokeStreamReq struct {
	GRPCMethod string `json:"grpc_method"`
	GRPCArgs   string `json:"grpc_args"`
}

type InvokeStreamResp struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data"`
	Error  string      `json:"error"`
}

type InfoResp struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data"`
	Error  string      `json:"error"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  2048,
	WriteBufferSize: 2048,
}

func (h *HTTPServer) infoHandler(w http.ResponseWriter, r *http.Request) {
	info, err := reflection.GetInfo(r.Context(), r.FormValue("addr"))
	enc := json.NewEncoder(w)
	if err != nil {
		log.Printf("Can't get grpc info: %v", err)

		w.WriteHeader(http.StatusInternalServerError)
		resp := &InfoResp{
			Status: "error",
			Error:  fmt.Sprintf("Can't get grpc info: %v", err),
		}
		if err := enc.Encode(resp); err != nil {
			log.Printf("Can't encode json response: %v", err)

		}
		return
	}

	resp := &InfoResp{
		Status: "ok",
		Data:   info,
	}
	if err := enc.Encode(resp); err != nil {
		log.Printf("Can't encode json response: %v", err)

	}
}

func (h *HTTPServer) invokeHandler(w http.ResponseWriter, r *http.Request) {
	if r.FormValue("stream") == "" {
		h.handleUnary(w, r)
		return
	}
	h.handleStream(w, r)
}

func (h *HTTPServer) handleUnary(w http.ResponseWriter, r *http.Request) {
	req := InvokeReq{}

	defer r.Body.Close()

	enc := json.NewEncoder(w)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		enc.Encode(&InvokeResp{
			Status: "error",
			Error:  err.Error(),
		})
		log.Printf("Can't decode request body: %v", err)
		return
	}
	invokeRes, err := proto.Invoke(r.Context(), req.Addr, req.PackageName, req.ServiceName, req.MethodName, req.GRPCArgs)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		enc.Encode(&InvokeResp{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	enc.Encode(&InvokeResp{
		Status: "ok",
		Data:   invokeRes,
	})
}

func (h *HTTPServer) handleStream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Can't upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	log.Print("WebSocket connected")
	defer log.Print("WebSocket disconnected")
	//
	//ctx, cancel := context.WithCancel(r.Context())
	//defer cancel()
	//
	//for {
	//	req := InvokeStreamReq{}
	//	if err := conn.ReadJSON(&req); err != nil {
	//		if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
	//			log.Printf("ReadJSON error: %v", err)
	//		}
	//		return
	//	}
	//}

}

func (h *HTTPServer) indexHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" || strings.HasPrefix(r.URL.Path, "/index.html") {
		w.Write(FSMustByte(false, "/static/index.html"))
		return
	}
	w.WriteHeader(404)
}

func (h *HTTPServer) Start() error {
	return http.ListenAndServe(h.addr, h.mux)
}
