let currentRating = null;
let testInProgress = false;
let pollInterval = null;

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

// Update progress indicator
function updateProgress(message) {
    const progressIndicator = document.getElementById('progressIndicator');
    const progressText = document.getElementById('progressText');
    
    progressText.textContent = message;
    progressIndicator.style.display = 'block';
}

// Hide progress indicator
function hideProgress() {
    document.getElementById('progressIndicator').style.display = 'none';
}

// Show speed reading
function showSpeedReading() {
    document.getElementById('speedReading').style.display = 'block';
}

// Hide speed reading
function hideSpeedReading() {
    document.getElementById('speedReading').style.display = 'none';
}

// Update speed value with animation
function updateSpeedValue(speed) {
    const speedValue = document.getElementById('speedValue');
    animateValue(speedValue, 0, speed, 2000);
}

// Enhanced speed analysis with better requirements
function analyzeSpeed(downloadSpeed, uploadSpeed, ping) {
    const activities = [
        {
            name: 'Browsing',
            icon: 'fas fa-globe',
            requirements: { 
                download: 3, 
                upload: 2, 
                ping: 150
            }
        },
        {
            name: 'Online Gaming',
            icon: 'fas fa-gamepad',
            requirements: { 
                download: 10, 
                upload: 4, 
                ping: 60
            }
        },
        {
            name: 'Video Streaming',
            icon: 'fas fa-video',
            requirements: { 
                download: 15, 
                upload: 5, 
                ping: 100
            }
        },
        {
            name: 'Video Call',
            icon: 'fas fa-video',
            requirements: { 
                download: 8, 
                upload: 9, 
                ping: 80
            }
        }
    ];
    
    const analysis = activities.map(activity => {
        // Calculate scores for each requirement
        const downloadScore = downloadSpeed >= activity.requirements.download ? 1 : 0;
        const uploadScore = uploadSpeed >= activity.requirements.upload ? 1 : 0;
        const pingScore = ping <= activity.requirements.ping ? 1 : 0;
        
        const totalScore = downloadScore + uploadScore + pingScore;
        
        let status, statusClass;
        if (totalScore === 3) {
            status = 'Excellent';
            statusClass = 'great';
        } else if (totalScore === 2) {
            status = 'Good';
            statusClass = 'good';
        } else if (totalScore === 1) {
            status = 'Normal';
            statusClass = 'normal';
        } else {
            status = 'Poor';
            statusClass = 'poor';
        }
        
        return {
            ...activity,
            status,
            statusClass
        };
    });
    
    return analysis;
}

// Enhanced activity analysis display
function displayActivityAnalysis(downloadSpeed, uploadSpeed, pinglatency) {
    const analysis = analyzeSpeed(downloadSpeed, uploadSpeed, pinglatency);
    const activityGrid = document.getElementById('activityGrid');
    const activityAnalysis = document.getElementById('activityAnalysis');
    
    activityGrid.innerHTML = '';
    
    analysis.forEach((activity, index) => {
        const activityItem = document.createElement('div');
        activityItem.className = `activity-item ${activity.statusClass}`;
        activityItem.style.animationDelay = `${index * 0.1}s`;
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

// Animate value counting
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toFixed(1);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
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

// Start speed test
async function startSpeedTest() {
    if (testInProgress) return;
    
    testInProgress = true;
    const btn = document.getElementById('startTestBtn');
    
    // Reset UI
    hideError();
    hideSpeedReading();
    document.getElementById('downloadValue').textContent = '--';
    document.getElementById('uploadValue').textContent = '--';
    document.getElementById('pingValue').textContent = '--';
    document.getElementById('activityAnalysis').style.display = 'none';
    
    // Show progress
    updateProgress('Initializing test...');
    
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
                updateProgress(progress.message);
                
                // Update server info during server finding phase
                if (progress.current_phase === 'finding_server' || progress.current_phase === 'server_found') {
                    document.getElementById('serverName').textContent = progress.message;
                }
                
                // Show speed reading during download phase
                if (progress.current_phase === 'testing_download') {
                    showSpeedReading();
                    const simulatedSpeed = Math.min(progress.progress * 10, 800);
                    updateSpeedValue(simulatedSpeed);
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
    hideProgress();
    
    setTimeout(() => {
        resetTestUI();
    }, 2000);
}

// Display test results
function displayResults(results) {
    console.log('Displaying results:', results); // Debug log
    
    // Hide progress
    hideProgress();
    
    // Show final speed reading
    showSpeedReading();
    updateSpeedValue(results.download);
    
    // Animate metrics
    animateMetric('downloadValue', results.download);
    animateMetric('uploadValue', results.upload);
    animateMetric('pingValue', results.ping);
    
    // Display activity analysis with the actual results
    displayActivityAnalysis(results.download, results.upload, results.ping);
    
    // Update server info
    document.getElementById('serverName').textContent = results.server.sponsor;
    document.getElementById('serverLocation').textContent = `${results.server.city}, ${results.server.country}`;
    document.getElementById('serverId').textContent = results.server.host;
    
    // Add animations
    document.getElementById('speedReading').classList.add('fade-in');
    document.querySelectorAll('.metric-card').forEach((card, index) => {
        card.classList.add('slide-in');
        card.style.animationDelay = `${index * 0.2}s`;
    });
    
    // Reset button
    setTimeout(() => {
        resetTestUI();
    }, 2000);
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
    // Initial setup
    hideProgress();
    hideSpeedReading();
    
    // Test the analysis display with sample data
    // Uncomment below to test the analysis display:
    // setTimeout(() => {
    //     displayActivityAnalysis(85.5, 22.3, 28);
    // }, 1000);
});