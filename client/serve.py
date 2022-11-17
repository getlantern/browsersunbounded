#!/usr/bin/python3

from http.server import HTTPServer, SimpleHTTPRequestHandler

ADDR = "0.0.0.0"
PORT = 9000
DIR = "dist/public/"

class CORSRequestHandler(SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=DIR, **kwargs)

  def end_headers(self):
    self.send_header("Access-Control-Allow-Origin", "*")
    return super(CORSRequestHandler, self).end_headers()

httpd = HTTPServer((ADDR, PORT), CORSRequestHandler)
print(f"Serving HTTP on {ADDR}:{PORT}")
httpd.serve_forever()
