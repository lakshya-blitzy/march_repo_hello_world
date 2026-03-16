# hao-backprop-test

A minimal Python Flask Hello World HTTP server for backprop integration testing and demonstration purposes.

## About

This project implements a simple HTTP server using the Flask web framework with minimal dependencies. It serves as a test project for backprop integration, demonstrating the fundamentals of HTTP server creation in Python with a clean, minimal implementation.

**Key Features:**
- **Minimal dependencies**: Uses only Flask web framework
- **Minimal implementation**: Single file application under 20 lines of code
- **Simple API**: Single endpoint responding with "Hello, World!"
- **Production-ready foundation**: Can be extended for real-world applications

## Prerequisites

Before running this project, ensure you have the following installed:

- **Python** (>= 3.9)
  - pip comes bundled with Python
  - Download from [python.org](https://www.python.org/)
- **Operating System**: Windows, macOS, or Linux

**Flask is the single dependency** and is installed automatically via pip during the installation step below.

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hao-backprop-test
```

2. Navigate to the project directory:
```bash
cd hao-backprop-test
```

3. Set up a Python virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Quick Start

1. Start the server:
```bash
python app.py
```

2. You should see the following output:
```
Server running at http://127.0.0.1:3000/
```

3. Verify the server is running by opening your browser and navigating to:
```
http://localhost:3000
```

4. You should see: `Hello, World!`

5. To stop the server, press `Ctrl+C` in the terminal.

## Usage

### Running the Server

Start the server with:
```bash
python app.py
```

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## API Documentation

### Endpoints

#### `GET *` (All Paths)

The server responds to **all HTTP requests** on any path with the same response.

**Request:**
- **Method**: Any HTTP method (GET, POST, PUT, DELETE, etc.)
- **Path**: Any path (e.g., `/`, `/test`, `/api/users`)
- **Headers**: None required
- **Body**: Ignored

**Response:**
- **Status Code**: `200 OK`
- **Headers**: `Content-Type: text/plain`
- **Body**: `Hello, World!\n`

**Example Requests:**

Using **curl**:
```bash
curl http://localhost:3000
# Output: Hello, World!

curl http://localhost:3000/any/path
# Output: Hello, World!
```

Using **browser**: Navigate to `http://localhost:3000` in any web browser.

Using **Python requests**:
```python
import requests
response = requests.get('http://localhost:3000')
print(response.text)  # Outputs: Hello, World!
```

## Configuration

The server configuration is defined by two constants in `app.py`:

### Hostname

```python
HOSTNAME = '127.0.0.1'
```

- **Default Value**: `'127.0.0.1'` (localhost only)
- **Description**: Determines which network interface the server binds to
- **Localhost Only**: Current setting only allows connections from the same machine
- **External Access**: Change to `'0.0.0.0'` to allow connections from other machines on the network

**Example for external access:**
```python
HOSTNAME = '0.0.0.0'  # Allows external connections
```

### Port

```python
PORT = 3000
```

- **Default Value**: `3000`
- **Description**: The TCP port the server listens on
- **Valid Range**: 1-65535
- **Privileged Ports**: Ports below 1024 require elevated privileges (root/administrator)
- **Common Alternatives**: 8000, 8080, 3000, 5000

**Example for different port:**
```python
PORT = 8080  # Use port 8080 instead
```

### Environment Variables (Future Enhancement)

For production deployments, consider implementing environment variable configuration:

```python
import os
HOSTNAME = os.environ.get('HOST', '127.0.0.1')
PORT = int(os.environ.get('PORT', 3000))
```

## Code Overview

This section provides a detailed walkthrough of the `app.py` implementation.

### Architecture

The project uses a single-file Flask application architecture leveraging Werkzeug's WSGI-based request handling. The server is built with the Flask web framework, which provides routing, request parsing, and response construction on top of the Werkzeug WSGI toolkit.

### Line-by-Line Explanation

**Import: Flask Framework**
```python
from flask import Flask, make_response
```
Imports the Flask class for application instantiation and `make_response` for explicit HTTP response construction with full control over status code, headers, and body.

**App Instantiation**
```python
app = Flask(__name__)
```
Creates the Flask WSGI application instance. The `__name__` argument tells Flask to use the current module's name for resource resolution.

**Configuration Constants**
```python
HOSTNAME = '127.0.0.1'
PORT = 3000
```
Defines server binding configuration:
- `HOSTNAME`: Network interface to bind to (localhost only)
- `PORT`: TCP port number for incoming connections

**Catch-All Route**
```python
@app.route('/', defaults={'path': ''}, methods=[
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
])
@app.route('/<path:path>', methods=[
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
])
def hello_world(path):
    response = make_response('Hello, World!\n', 200)
    response.headers['Content-Type'] = 'text/plain'
    return response
```
Dual-decorator pattern implementing the universal request handler:
- `@app.route('/', defaults={'path': ''})`: Matches the root URL path
- `@app.route('/<path:path>')`: Matches all other URL paths using Flask's path converter
- `methods=[...]`: Accepts all standard HTTP methods, mirroring the universal acceptance behavior
- `make_response('Hello, World!\n', 200)`: Constructs the response with status code 200 (OK)
- `response.headers['Content-Type'] = 'text/plain'`: Sets the Content-Type header to indicate plain text

**Entry Point**
```python
if __name__ == '__main__':
    print(f'Server running at http://{HOSTNAME}:{PORT}/')
    app.run(host=HOSTNAME, port=PORT)
```
Guard clause ensuring the development server only starts when the file is run directly:
- `if __name__ == '__main__':`: Standard Python entry point guard, also allows WSGI servers (e.g., Gunicorn) to import the module without auto-starting the development server
- `print(...)`: Outputs confirmation message with server URL
- `app.run(...)`: Starts the Flask development server bound to the configured host and port

### WSGI Request Handling

Flask uses Werkzeug's WSGI server in development mode. When a request arrives:
1. Werkzeug's development server receives the incoming HTTP connection
2. The request is parsed and routed through Flask's URL routing system
3. The matching view function (`hello_world`) executes synchronously
4. The response is serialized and sent back to the client

For production deployments, use Gunicorn or uWSGI as the WSGI server for concurrent request handling with multiple worker processes.

## Deployment

### Local Development

The current configuration is optimized for local development:

```bash
python app.py
```

The server binds to `127.0.0.1` (localhost), making it accessible only from your local machine at `http://localhost:3000`.

### Production Considerations

#### 1. Process Management

**Using Gunicorn** (recommended):
```bash
# Install Gunicorn
pip install gunicorn

# Start the server with Gunicorn
gunicorn -w 4 -b 127.0.0.1:3000 app:app

# Run as a daemon
gunicorn -w 4 -b 127.0.0.1:3000 --daemon app:app
```

**Using systemd** (Linux):
Create `/etc/systemd/system/hello-world.service`:
```ini
[Unit]
Description=Hello World Flask Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/hello-world
ExecStart=/opt/hello-world/venv/bin/gunicorn -w 4 -b 127.0.0.1:3000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable hello-world
sudo systemctl start hello-world
```

#### 2. Binding to External Interface

For production, modify `app.py` to allow external connections:

```python
HOSTNAME = '0.0.0.0'  # Binds to all network interfaces
```

Or use environment variables:
```python
import os
HOSTNAME = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', 3000))
```

#### 3. Reverse Proxy Setup

**Using Nginx**:

Create `/etc/nginx/sites-available/hello-world`:
```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/hello-world /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. HTTPS/TLS Configuration

Terminate TLS at the reverse proxy level using Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d example.com

# Auto-renewal is configured automatically
```

#### 5. Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Keep Flask port internal only
sudo ufw deny 3000/tcp
```

#### 6. Environment Variables

Set production environment variables:

```bash
# Using systemd
Environment="FLASK_ENV=production"
Environment="PORT=3000"
Environment="HOST=127.0.0.1"

# Using Gunicorn with environment variables
FLASK_ENV=production HOST=127.0.0.1 PORT=3000 gunicorn -w 4 -b 127.0.0.1:3000 app:app
```

## Troubleshooting

### Common Issue 1: Port Already in Use

**Error Message:**
```
OSError: [Errno 98] Address already in use
```

**Cause**: Another process is already using port 3000.

**Solutions:**

**Option A**: Find and kill the process using the port

*On macOS/Linux:*
```bash
# Find process ID
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill

# Or force kill if necessary
lsof -ti:3000 | xargs kill -9
```

*On Windows:*
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Option B**: Change the port in `app.py`:
```python
PORT = 8080  # Use a different port
```

### Common Issue 2: Permission Denied

**Error Message:**
```
PermissionError: [Errno 13] Permission denied
```

**Cause**: Attempting to bind to a privileged port (< 1024) without elevated privileges.

**Solutions:**

**Option A**: Use a non-privileged port (recommended):
```python
PORT = 3000  # Use port >= 1024
```

**Option B**: Run with elevated privileges (not recommended for development):
```bash
sudo python app.py
```

**Option C**: Use a reverse proxy (recommended for production) - see Deployment section.

### Common Issue 3: Cannot Access from Other Machines

**Symptom**: Server works on `localhost` but not accessible from other devices on the network.

**Cause**: Server is bound to `127.0.0.1` (localhost only).

**Solution**: Change hostname to bind to all interfaces:
```python
HOSTNAME = '0.0.0.0'  # Allows external connections
```

Then access using your machine's IP address:
```bash
# Find your IP address
# macOS/Linux:
ifconfig | grep "inet "

# Windows:
ipconfig

# Access from another device
curl http://<YOUR-IP>:3000
```

**Security Note**: Only bind to `0.0.0.0` on trusted networks. For production, use a firewall and reverse proxy.

### Common Issue 4: Python Not Found

**Error Message:**
```
python: command not found
```

**Cause**: Python is not installed or not in the system PATH.

**Solutions:**

**Option A**: Install Python from official source:
- Visit [python.org](https://www.python.org/)
- Download and install the latest stable version (>= 3.9)

**Option B**: Use pyenv (Python version manager):
```bash
# Install pyenv
curl https://pyenv.run | bash

# Install Python
pyenv install 3.12
pyenv global 3.12
```

**Option C**: Check if Python is installed but not in PATH:
```bash
# Find Python location
which python3

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH="/path/to/python:$PATH"
```

### Common Issue 5: Server Stops When Terminal Closes

**Cause**: The Python process is attached to the terminal session.

**Solutions:**

**Option A**: Use Gunicorn with systemd (recommended):
```bash
# See Deployment section for systemd setup
sudo systemctl start hello-world
```

**Option B**: Use nohup:
```bash
nohup python app.py &
```

**Option C**: Use screen or tmux:
```bash
screen -S hello-world
python app.py
# Detach with Ctrl+A, D
```

## License

This project is licensed under the **MIT License**.

The MIT License is a permissive free software license that allows:
- Commercial use
- Modification
- Distribution
- Private use

For the full license text, visit [choosealicense.com/licenses/mit](https://choosealicense.com/licenses/mit/).

## Author

**hxu** - Original author

## Acknowledgments

This project was created as a test project for backprop integration, demonstrating the simplicity and power of the Flask web framework for building HTTP servers in Python.

---

**Project Version**: 1.0.0  
**Python Compatibility**: >= 3.9  
**Last Updated**: 2025
