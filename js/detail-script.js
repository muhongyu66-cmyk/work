    // 获取URL参数
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            city: params.get('city'),
            id: params.get('id'),
            lat: params.get('lat'),
            lng: params.get('lng')
        };
    }

    // 更新当前时间
    function updateCurrentTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentTime').textContent = now.toLocaleDateString('zh-CN', options);
    }

    // 获取天气数据
    async function fetchWeatherData() {
        const params = getUrlParams();
        const weatherApiKey = '7a62b5f4a29048fbb9f7839c58a74b02';

        if (!params.id) {
            showError();
            return;
        }

        // 更新城市名称
        document.getElementById('cityTitle').textContent = decodeURIComponent(params.city) + ' 天气详情';

        try {
            // 获取当前天气
            const currentUrl = `https://pc5khvkgqm.re.qweatherapi.com/v7/weather/now?location=${params.id}&key=${weatherApiKey}`;
            const currentResponse = await fetch(currentUrl);
            const currentData = await currentResponse.json();

            // 获取7天预报
            const forecastUrl = `https://pc5khvkgqm.re.qweatherapi.com/v7/weather/7d?location=${params.id}&key=${weatherApiKey}`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();

            // 获取24小时预报
            const hourlyUrl = `https://pc5khvkgqm.re.qweatherapi.com/v7/weather/24h?location=${params.id}&key=${weatherApiKey}`;
            const hourlyResponse = await fetch(hourlyUrl);
            const hourlyData = await hourlyResponse.json();

            if (currentData.code === '200' && forecastData.code === '200') {
                displayWeatherData(currentData, forecastData, hourlyData);
            } else {
                showError();
            }
        } catch (error) {
            console.error('获取天气数据失败:', error);
            showError();
        }
    }

    // 显示天气数据
    function displayWeatherData(currentData, forecastData, hourlyData) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';

        // 更新当前天气
        const now = currentData.now;
        document.getElementById('currentTemp').textContent = `${now.temp}°C`;
        document.getElementById('feelsLike').textContent = `${now.feelsLike}°C`;
        document.getElementById('weatherText').textContent = now.text;
        document.getElementById('humidity').textContent = `${now.humidity}%`;
        document.getElementById('windSpeed').textContent = `${now.windSpeed} km/h`;
        document.getElementById('windDir').textContent = now.windDir;
        document.getElementById('pressure').textContent = `${now.pressure} hPa`;
        document.getElementById('visibility').textContent = `${now.vis} km`;
        document.getElementById('updateTime').textContent = formatTime(now.obsTime);

        // 更新天气图标
        const weatherIcon = document.querySelector('.weather-icon');
        weatherIcon.textContent = getWeatherEmoji(now.text);

        // 更新7天预报
        updateForecast(forecastData.daily);

        // 创建图表
        createCharts(forecastData.daily, hourlyData.hourly);
    }

    // 更新7天预报
    function updateForecast(dailyData) {
        const forecastContainer = document.getElementById('forecastDays');
        forecastContainer.innerHTML = '';

        dailyData.slice(0, 7).forEach(day => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';

            const date = new Date(day.fxDate);
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const weekday = weekdays[date.getDay()];

            dayCard.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${weekday}</div>
                    <div style="color: #666; font-size: 0.9em; margin-bottom: 10px;">${day.fxDate.substring(5)}</div>
                    <div style="font-size: 1.5em; margin: 10px 0;">${getWeatherEmoji(day.textDay)}</div>
                    <div>${day.textDay}</div>
                    <div class="day-temp" style="margin: 10px 0;">
                        ${day.tempMax}° / ${day.tempMin}°
                    </div>
                    <div style="color: #3498db; font-size: 0.9em;">
                        降水: ${day.precip}mm
                    </div>
                `;

            forecastContainer.appendChild(dayCard);
        });
    }

    // 创建图表
    function createCharts(dailyData, hourlyData) {
        // 温度图表
        const tempCtx = document.getElementById('tempChart').getContext('2d');
        const dates = dailyData.slice(0, 7).map(day => day.fxDate.substring(5));
        const maxTemps = dailyData.slice(0, 7).map(day => parseInt(day.tempMax));
        const minTemps = dailyData.slice(0, 7).map(day => parseInt(day.tempMin));

        new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: '最高温度',
                        data: maxTemps,
                        borderColor: '#ff6b35',
                        backgroundColor: 'rgba(255, 107, 53, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: '最低温度',
                        data: minTemps,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '未来7天温度变化'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: '温度 (°C)'
                        }
                    }
                }
            }
        });

        // 降水量图表
        const precipCtx = document.getElementById('precipChart').getContext('2d');
        const precipData = dailyData.slice(0, 7).map(day => parseFloat(day.precip));

        new Chart(precipCtx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: '降水量 (mm)',
                    data: precipData,
                    backgroundColor: precipData.map(value =>
                        value > 10 ? 'rgba(52, 152, 219, 0.8)' :
                            value > 5 ? 'rgba(52, 152, 219, 0.6)' :
                                'rgba(52, 152, 219, 0.4)'
                    ),
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '未来7天降水量预报'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '降水量 (mm)'
                        }
                    }
                }
            }
        });
    }

    // 格式化时间
    function formatTime(timeString) {
        if (!timeString) return '--';
        const date = new Date(timeString);
        return date.toLocaleString('zh-CN');
    }

    // 获取天气对应的emoji
    function getWeatherEmoji(weatherText) {
        const emojiMap = {
            '晴': '☀️',
            '多云': '⛅',
            '阴': '☁️',
            '雨': '🌧️',
            '小雨': '🌦️',
            '中雨': '🌧️',
            '大雨': '⛈️',
            '雪': '❄️',
            '小雪': '🌨️',
            '中雪': '❄️',
            '大雪': '🌨️',
            '雾': '🌫️',
            '霾': '😷',
            '雷阵雨': '⛈️',
            '阵雨': '🌦️'
        };

        for (const [key, emoji] of Object.entries(emojiMap)) {
            if (weatherText.includes(key)) {
                return emoji;
            }
        }
        return '🌈';
    }

    // 显示错误
    function showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }

    // 页面加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        updateCurrentTime();
        fetchWeatherData();

        // 每分钟更新时间
        setInterval(updateCurrentTime, 60000);
    });