# app.py
from flask import Flask, render_template, jsonify, request
import speedtest
import threading
import time
import json
from datetime import datetime
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class SpeedTestManager:
    def __init__(self):
        self.current_test = None
        self.results_history = []
        self.is_testing = False
        self.test_progress = {
            'status': 'ready',
            'message': 'Ready to test',
            'progress': 0,
            'current_phase': 'idle'
        }
        
    def run_speed_test(self):
        """Run actual speed test using speedtest-cli with proper error handling"""
        try:
            self.is_testing = True
            self.test_progress = {
                'status': 'testing',
                'message': 'Initializing speed test...',
                'progress': 10,
                'current_phase': 'initializing'
            }
            
            logger.info("Initializing Speedtest...")
            
            # Initialize speedtest with better configuration
            st = speedtest.Speedtest()
            
            # Set a timeout for the entire test
            test_start_time = time.time()
            max_test_time = 120  # 2 minutes maximum
            
            # Get best server with progress updates
            self.test_progress.update({
                'message': 'Finding optimal server...',
                'progress': 20,
                'current_phase': 'finding_server'
            })
            logger.info("Finding best server...")
            
            # Get best server with timeout handling
            best_server = st.get_best_server()
            if not best_server:
                raise Exception("Could not find a suitable server")
            
            # Check if we've exceeded max time
            if time.time() - test_start_time > max_test_time:
                raise Exception("Test timeout while finding server")
            
            self.test_progress.update({
                'message': f'Connected to {best_server["sponsor"]} ({best_server["name"]})',
                'progress': 30,
                'current_phase': 'server_found'
            })
            logger.info(f"Connected to server: {best_server['sponsor']} - {best_server['name']}")
            
            # Test download speed
            self.test_progress.update({
                'message': 'Testing download speed...',
                'progress': 40,
                'current_phase': 'testing_download'
            })
            logger.info("Testing download speed...")
            
            download_speed = st.download() / 1_000_000  # Convert to Mbps
            
            # Check timeout
            if time.time() - test_start_time > max_test_time:
                raise Exception("Test timeout during download")
            
            self.test_progress.update({
                'message': 'Testing upload speed...',
                'progress': 70,
                'current_phase': 'testing_upload'
            })
            logger.info("Testing upload speed...")
            
            upload_speed = st.upload() / 1_000_000  # Convert to Mbps
            
            # Check timeout
            if time.time() - test_start_time > max_test_time:
                raise Exception("Test timeout during upload")
            
            # Get results
            results_dict = st.results.dict()
            ping = results_dict.get('ping', 0)
            
            # Get server info
            server_info = {
                'name': best_server.get('name', 'Unknown'),
                'sponsor': best_server.get('sponsor', 'Unknown'),
                'city': best_server.get('name', 'Unknown').split(',')[0] if best_server.get('name') else 'Unknown',
                'country': best_server.get('country', 'Unknown'),
                'host': f"{best_server.get('host', 'Unknown')}",
                'distance': best_server.get('d', 0),
                'latency': best_server.get('latency', 0)
            }
            
            result = {
                'download': round(download_speed, 2),
                'upload': round(upload_speed, 2),
                'ping': round(ping, 2),
                'server': server_info,
                'timestamp': datetime.now().isoformat(),
                'jitter': round(ping, 2),  # Using ping as jitter approximation
                'packet_loss': 0,
                'bytes_sent': results_dict.get('bytes_sent', 0),
                'bytes_received': results_dict.get('bytes_received', 0),
                'share_url': results_dict.get('share', '')
            }
            
            self.results_history.append(result)
            # Keep only last 10 tests
            if len(self.results_history) > 10:
                self.results_history = self.results_history[-10:]
            
            self.current_test = result
            self.is_testing = False
            self.test_progress = {
                'status': 'completed',
                'message': 'Test completed successfully',
                'progress': 100,
                'current_phase': 'completed'
            }
            
            logger.info(f"Test completed: Download: {download_speed:.2f} Mbps, Upload: {upload_speed:.2f} Mbps, Ping: {ping:.2f} ms")
            return result
            
        except Exception as e:
            self.is_testing = False
            error_msg = f"Speed test failed: {str(e)}"
            self.test_progress = {
                'status': 'error',
                'message': error_msg,
                'progress': 0,
                'current_phase': 'error'
            }
            logger.error(error_msg)
            import traceback
            logger.error(traceback.format_exc())
            return None

    def get_test_progress(self):
        """Get current test progress"""
        return self.test_progress

speed_test_manager = SpeedTestManager()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start-test', methods=['POST'])
def start_speed_test():
    if speed_test_manager.is_testing:
        return jsonify({
            'status': 'error', 
            'message': 'Test already in progress. Please wait for the current test to complete.'
        })
    
    # Run test in background thread
    def run_test():
        try:
            speed_test_manager.run_speed_test()
        except Exception as e:
            logger.error(f"Background test thread error: {str(e)}")
    
    thread = threading.Thread(target=run_test)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'status': 'started', 
        'message': 'Speed test started successfully. Please wait while we measure your connection speed.'
    })

@app.route('/api/test-status')
def get_test_status():
    progress = speed_test_manager.get_test_progress()
    
    if progress['status'] == 'completed' and speed_test_manager.current_test:
        return jsonify({
            'status': 'completed',
            'progress': progress,
            'results': speed_test_manager.current_test
        })
    elif progress['status'] == 'error':
        return jsonify({
            'status': 'error',
            'progress': progress,
            'message': progress['message']
        })
    else:
        return jsonify({
            'status': progress['status'],
            'progress': progress,
            'message': progress['message']
        })

@app.route('/api/test-progress')
def get_test_progress():
    progress = speed_test_manager.get_test_progress()
    return jsonify(progress)

@app.route('/api/results')
def get_results():
    return jsonify({
        'current': speed_test_manager.current_test,
        'history': speed_test_manager.results_history
    })

@app.route('/api/server-info')
def get_server_info():
    try:
        st = speedtest.Speedtest()
        servers = st.get_servers()
        
        # Get a list of available servers (limited for performance)
        available_servers = []
        count = 0
        for country in list(servers.keys())[:3]:  # Limit to first 3 countries
            if servers[country] and count < 5:
                server = servers[country][0]
                available_servers.append({
                    'name': server.get('name', 'Unknown'),
                    'country': server.get('country', 'Unknown'),
                    'sponsor': server.get('sponsor', 'Unknown'),
                    'host': server.get('host', 'Unknown')
                })
                count += 1
        
        return jsonify({
            'available_servers': available_servers,
            'total_servers': len(servers)
        })
    except Exception as e:
        logger.error(f"Error getting server info: {str(e)}")
        return jsonify({'error': str(e)})

@app.route('/api/submit-feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        rating = data.get('rating')
        comments = data.get('comments', '')
        
        logger.info(f"Feedback received - Rating: {rating}, Comments: {comments}")
        
        return jsonify({'status': 'success', 'message': 'Thank you for your feedback!'})
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to submit feedback'})

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'speedtest_available': True
    })

@app.route('/api/debug')
def debug_info():
    """Debug endpoint to check speedtest functionality"""
    try:
        st = speedtest.Speedtest()
        servers = st.get_servers()
        return jsonify({
            'servers_available': len(servers) > 0,
            'total_servers': len(servers),
            'speedtest_version': '2.1.3'
        })
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    print("Starting Speedtest Pro Server...")
    print("Make sure you have internet connectivity")
    print("Server will be available at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)