 let currentRating = null;
        let testInProgress = false;
        let pollInterval = null;
        
        // Speedometer labels and values
        const speedLabels = [0, 5, 10, 20, 50, 100, 250, 500, 750, 1000];
        
        // Initialize speedometer
        function initializeSpeedometer() {
            const labelsContainer = document.getElementById('speedometerLabels');
            labelsContainer.innerHTML = '';
            
            // Create labels and marks
            speedLabels.forEach((speed, index) => {
                const angle = (speed / 1000) * 180 - 90; // -90 to 90 degrees
                
                // Create label
                const label = document.createElement('div');
                label.className = 'speedometer-label';
                label.textContent = speed === 1000 ? '1000+' : speed;
                label.style.bottom = '20px';
                label.style.left = `calc(50% + ${Math.cos(angle * Math.PI / 180) * 120}px)`;
                label.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                labelsContainer.appendChild(label);
                
                // Create main mark
                const mark = document.createElement('div');
                mark.className = 'speedometer-mark main';
                mark.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                labelsContainer.appendChild(mark);
            });
        }
        
        // Update speedometer
        function updateSpeedometer(speed) {
            const needle = document.getElementById('speedometerNeedle');
            const speedValue = document.getElementById('speedValue');
            const bestIcon = document.getElementById('bestIcon');
            
            const maxSpeed = 1000;
            const percentage = Math.min(speed / maxSpeed, 1);
            const angle = percentage * 180 - 90; // -90 to 90 degrees
            
            // Update needle rotation
            needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
            
            // Update speed value
            speedValue.textContent = speed.toFixed(1);
            
            // Show best icon for excellent speeds
            if (speed >= 500) {
                bestIcon.classList.add('show');
            } else {
                bestIcon.classList.remove('show');
            }
        }
        
        // Analyze internet speed for different activities
        function analyzeSpeed(downloadSpeed, uploadSpeed, ping) {
            const activities = [
                {
                    name: 'Browsing',
                    icon: 'fas fa-globe',
                    requirements: { download: 5, upload: 1, ping: 100 }
                },
                {
                    name: 'Online Gaming',
                    icon: 'fas fa-gamepad',
                    requirements: { download: 15, upload: 5, ping: 50 }
                },
                {
                    name: 'Video Streaming',
                    icon: 'fas fa-video',
                    requirements: { download: 25, upload: 5, ping: 100 }
                },
                {
                    name: 'Video Call',
                    icon: 'fas fa-video',
                    requirements: { download: 10, upload: 10, ping: 80 }
                }
            ];
            
            const analysis = activities.map(activity => {
                const downloadScore = downloadSpeed >= activity.requirements.download ? 1 : 0;
                const uploadScore = uploadSpeed >= activity.requirements.upload ? 1 : 0;
                const pingScore = ping <= activity.requirements.ping ? 1 : 0;
                const totalScore = downloadScore + uploadScore + pingScore;
                
                let status, statusClass;
                if (totalScore === 3) {
                    status = 'Great';
                    statusClass = 'great';
                } else if (totalScore === 2) {
                    status = 'Good';
                    statusClass = 'good';
                } else if (totalScore === 1) {
                    status = 'Normal';
                    statusClass = 'normal';
                } else {
                    status = 'bad';
                    statusClass = 'bad';
                }
                
                return {
                    ...activity,
                    status,
                    statusClass
                };
            });
            
            return analysis;
        }
        
        // Display activity analysis
        function displayActivityAnalysis(downloadSpeed, uploadSpeed, ping) {
            const analysis = analyzeSpeed(downloadSpeed, uploadSpeed, ping);
            const activityGrid = document.getElementById('activityGrid');
            const activityAnalysis = document.getElementById('activityAnalysis');
            
            activityGrid.innerHTML = '';
            
            analysis.forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = `activity-item ${activity.statusClass}`;
                activityItem.innerHTML = `
                    <div class="activity-icon">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-info">
                        <div class="activity-name">${activity.name}</div>
                        <div class="activity-status status-${activity.statusClass}">${activity.status}</div>
                    </div>
                `;
                activityGrid.appendChild(activityItem);
            });
            
            activityAnalysis.style.display = 'block';
            activityAnalysis.classList.add('slide-in');
        }
        
        // Show error message
        function showError(title, description) {
            const errorMessage = document.getElementById('errorMessage');
            const errorTitle = document.getElementById('errorTitle');
            const errorDescription = document.getElementById('errorDescription');
            
            errorTitle.textContent = title;
            errorDescription.textContent = description;
            errorMessage.classList.add('show');
        }
        
        // Hide error message
        function hideError() {
            document.getElementById('errorMessage').classList.remove('show');
        }
        
        // Set rating
        function setRating(rating) {
            currentRating = rating;
            
            // Remove active class from all ratings
            document.querySelectorAll('.rating-number').forEach(el => {
                el.classList.remove('active');
            });
            
            // Add active class to selected rating
            const selectedEl = document.querySelectorAll('.rating-number')[rating];
            selectedEl.classList.add('active');
            
            // Submit feedback
            fetch('/api/submit-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: rating,
                    comments: 'User rating from speed test'
                })
            }).catch(error => {
                console.error('Error submitting feedback:', error);
            });
        }
        
        // Start speed test
        async function startSpeedTest() {
            if (testInProgress) return;
            
            testInProgress = true;
            const btn = document.getElementById('startTestBtn');
            
            // Reset UI
            hideError();
            document.getElementById('downloadValue').textContent = '--';
            document.getElementById('uploadValue').textContent = '--';
            document.getElementById('pingValue').textContent = '--';
            document.getElementById('activityAnalysis').style.display = 'none';
            
            // Reset speedometer
            updateSpeedometer(0);
            
            // Disable button
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> TESTING...';
            
            // Update server info to show testing
            document.getElementById('serverName').textContent = 'Finding optimal server...';
            document.getElementById('serverLocation').textContent = 'Please wait';
            document.getElementById('serverId').textContent = 'Testing your connection speed';
            
            try {
                // Start the test
                const response = await fetch('/api/start-test', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                
                if (data.status === 'started') {
                    // Poll for results
                    startPolling();
                } else {
                    throw new Error(data.message || 'Failed to start test');
                }
                
            } catch (error) {
                console.error('Error starting test:', error);
                handleTestError('Connection Error', 'Failed to start speed test. Please check your internet connection.');
            }
        }
        
        // Start polling for test results
        function startPolling() {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            
            let pollCount = 0;
            const maxPolls = 120; // 4 minutes max
            
            pollInterval = setInterval(async () => {
                pollCount++;
                
                if (pollCount >= maxPolls) {
                    clearInterval(pollInterval);
                    handleTestError('Timeout Error', 'Speed test took too long to complete. Please try again.');
                    return;
                }
                
                try {
                    const response = await fetch('/api/test-status');
                    const data = await response.json();
                    
                    if (data.status === 'testing') {
                        // Update progress based on backend progress
                        const progress = data.progress;
                        
                        // Update server info during server finding phase
                        if (progress.current_phase === 'finding_server' || progress.current_phase === 'server_found') {
                            document.getElementById('serverName').textContent = progress.message;
                        }
                        
                        // Simulate speedometer during download/upload phases
                        if (progress.current_phase === 'testing_download') {
                            const simulatedSpeed = Math.min(progress.progress * 10, 800);
                            updateSpeedometer(simulatedSpeed);
                        } else if (progress.current_phase === 'testing_upload') {
                            const simulatedSpeed = Math.min(800 + (progress.progress - 70) * 2, 950);
                            updateSpeedometer(simulatedSpeed);
                        }
                        
                    } else if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        displayResults(data.results);
                        
                    } else if (data.status === 'error') {
                        clearInterval(pollInterval);
                        handleTestError('Test Error', data.message || 'Speed test failed');
                    }
                    
                } catch (error) {
                    console.error('Error polling for results:', error);
                }
            }, 2000);
        }
        
        // Handle test errors
        function handleTestError(title, description) {
            showError(title, description);
            
            // Reset speedometer
            updateSpeedometer(0);
            
            setTimeout(() => {
                resetTestUI();
            }, 2000);
        }
        
        // Display test results
        function displayResults(results) {
            // Final speedometer animation
            updateSpeedometer(results.download);
            
            // Animate metrics
            animateMetric('downloadValue', results.download);
            animateMetric('uploadValue', results.upload);
            animateMetric('pingValue', results.ping);
            
            // Display activity analysis
            displayActivityAnalysis(results.download, results.upload, results.ping);
            
            // Update server info
            document.getElementById('serverName').textContent = results.server.sponsor;
            document.getElementById('serverLocation').textContent = `${results.server.city}, ${results.server.country}`;
            document.getElementById('serverId').textContent = results.server.host;
            
            // Update detailed results
            document.getElementById('resultDownload').textContent = `${results.download} Mbps`;
            document.getElementById('resultUpload').textContent = `${results.upload} Mbps`;
            document.getElementById('resultPing').textContent = `${results.ping} ms`;
            document.getElementById('resultJitter').textContent = `${results.jitter} ms`;
            
            // Add slide-in animation to results
            document.querySelectorAll('.result-item').forEach((item, index) => {
                item.classList.add('slide-in');
                item.style.animationDelay = `${index * 0.1}s`;
            });
            
            // Reset button
            setTimeout(() => {
                resetTestUI();
            }, 2000);
        }
        
        // Animate metric value
        function animateMetric(elementId, targetValue) {
            const element = document.getElementById(elementId);
            let current = 0;
            const increment = targetValue / 50;
            const duration = 2000;
            const stepTime = duration / 50;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= targetValue) {
                    element.textContent = targetValue.toFixed(2);
                    clearInterval(timer);
                } else {
                    element.textContent = current.toFixed(2);
                }
            }, stepTime);
        }
        
        // Reset test UI
        function resetTestUI() {
            const btn = document.getElementById('startTestBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> START TEST';
            testInProgress = false;
            
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        }
        
        // Retry test
        function retryTest() {
            hideError();
            startSpeedTest();
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            initializeSpeedometer();
            updateSpeedometer(0);
        });