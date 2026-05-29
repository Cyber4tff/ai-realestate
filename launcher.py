import os
import sys
import time
import subprocess
import webbrowser
import signal

# Track background processes to kill them on launcher termination
running_processes = []

def terminate_local_processes():
    if running_processes:
        print("\n[+] Terminating local server processes...")
        for p in running_processes:
            try:
                # On Windows, taskkill or terminate kills processes cleanly
                p.terminate()
            except Exception:
                pass
        print("[+] Offline servers halted cleanly.")

def main():
    print("====================================================")
    print("           QUANTFLOW PLATFORM LAUNCHER              ")
    print("====================================================")
    
    # Locate the folder where the script/executable resides
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
    os.chdir(base_dir)
    print(f"Root Workspace: {base_dir}")
    
    # 1. Attempt Docker Compose Launch
    docker_success = False
    try:
        print("\n[+] Step 1: Checking Docker Daemon / Compose status...")
        # Run a quick check to see if docker is responsive
        docker_check = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if docker_check.returncode == 0:
            print("[+] Docker Daemon is active. Initializing docker-compose...")
            result = subprocess.run(
                ["docker-compose", "up", "-d"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("[+] Docker containers launched successfully in background!")
                docker_success = True
            else:
                print("[-] Docker Compose failed to spin up. Falling back to local host servers...")
        else:
            print("[-] Docker Daemon is offline or not installed. Falling back to local host servers...")
    except Exception as e:
        print("[-] Docker environment check failed. Falling back to local host servers...")
        
    # 2. Local Server Fallback Execution (Run directly on Windows host)
    if not docker_success:
        print("\n====================================================")
        print("    [!] STANDALONE OFFLINE LOCAL SERVER MODE        ")
        print("====================================================")
        print("[+] Starting FastAPI backend local server (Uvicorn)...")
        
        backend_dir = os.path.join(base_dir, "backend")
        frontend_dir = os.path.join(base_dir, "frontend")
        
        try:
            # Resolve exact python interpreter using Conda environment prefix
            conda_prefix = os.environ.get("CONDA_PREFIX", "C:\\Users\\cyber\\miniconda3")
            python_path = os.path.join(conda_prefix, "python.exe")
            if not os.path.exists(python_path):
                python_path = "python"
                
            backend_process = subprocess.Popen(
                [python_path, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
                cwd=backend_dir,
                stdout=subprocess.DEVNULL, # Keep console logs clean
                stderr=subprocess.DEVNULL
            )
            running_processes.append(backend_process)
            print("[+] Backend Server process started at http://localhost:8000")
            
            # Run Next.js frontend using local npm
            # shell=True is required on Windows for cmd-wrapped command paths like npm
            print("[+] Starting Next.js frontend server (npm)...")
            frontend_process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            running_processes.append(frontend_process)
            print("[+] Frontend Server process started at http://localhost:3000")
            
        except Exception as e:
            print(f"\n[!] ERROR: Failed to start host servers: {e}")
            input("\nPress Enter to exit...")
            sys.exit(1)
            
    # 3. Finalize Startup & Browser Launch
    print("\n[+] Launching console dashboard...")
    time.sleep(5)
    
    url = "http://localhost:3000"
    webbrowser.open(url)
    print(f"\n[+] QuantFlow Console dashboard opened in browser.")
    print("----------------------------------------------------")
    print(" KEEP THIS CONSOLE OPEN TO RUN SERVER PROCESSES.   ")
    print(" PRESS CTRL+C OR CLOSE THIS WINDOW TO SHUTDOWN.     ")
    print("----------------------------------------------------")
    
    # Stay alive to keep servers active, intercept SIGINT / exit
    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        terminate_local_processes()
        print("\nShutdown complete.")

if __name__ == "__main__":
    main()
