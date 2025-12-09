
// 全局配置
const CONFIG = {
    WEATHER_API_KEY: '7a62b5f4a29048fbb9f7839c58a74b02',
    BAIDU_MAP_KEY: '1XGUOZxX7RGA2a4BfiBGD4q4t3p6o3ys'
};

// 坐标转换函数：百度BD09 -> WGS84
function bd09ToWgs84(lng, lat) {
    const x_PI = (3.14159265358979324 * 3000.0) / 180.0;
    const PI = 3.1415926535897932384626;

    let x = lng - 0.0065;
    let y = lat - 0.006;
    let z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_PI);
    let theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_PI);
    let wgs_lng = z * Math.cos(theta);
    let wgs_lat = z * Math.sin(theta);

    return {
        lng: wgs_lng.toFixed(6),
        lat: wgs_lat.toFixed(6)
    };
}

// 格式化时间
function formatTime(timeString) {
    if (!timeString) return '--';
    try {
        const date = new Date(timeString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return timeString;
    }
}

// 获取天气对应的emoji图标
function getWeatherEmoji(weatherText) {
    const emojiMap = {
        '晴': '☀️',
        '多云': '⛅',
        '阴': '☁️',
        '雨': '🌧️',
        '小雨': '🌦️',
        '中雨': '🌧️',
        '大雨': '⛈️',
        '暴雨': '🌧️💨',
        '雪': '❄️',
        '小雪': '🌨️',
        '中雪': '❄️',
        '大雪': '🌨️',
        '暴雪': '❄️💨',
        '雾': '🌫️',
        '霾': '😷',
        '沙尘': '🌪️',
        '浮尘': '💨',
        '扬沙': '💨',
        '雷阵雨': '⛈️',
        '阵雨': '🌦️',
        '阵雪': '🌨️',
        '冻雨': '🧊🌧️',
        '雨夹雪': '🌧️❄️'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (weatherText.includes(key)) {
            return emoji;
        }
    }
    return '🌈';
}

// 存储最近查询的天气信息
function saveWeatherQuery(cityName, cityId, lat, lng, weatherData) {
    const queryData = {
        cityName,
        cityId,
        lat,
        lng,
        weatherData,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('lastWeatherQuery', JSON.stringify(queryData));
}

// 获取最近查询的天气信息
function getLastWeatherQuery() {
    const saved = localStorage.getItem('lastWeatherQuery');
    if (saved) {
        const data = JSON.parse(saved);
        // 检查数据是否过期（30分钟内有效）
        const now = new Date().getTime();
        if (now - data.timestamp < 30 * 60 * 1000) {
            return data;
        }
    }
    return null;
}

// 显示错误信息
function showError(elementId, message = '请求失败，请重试') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// 隐藏元素
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// 显示元素
function showElement(elementId, displayType = 'block') {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayType;
    }
}

// 验证API密钥
function validateApiKeys() {
    if (CONFIG.WEATHER_API_KEY === '你的和风天气API密钥') {
        console.error('请先在utils.js中配置和风天气API密钥');
        return false;
    }
    return true;
}

// 导出函数（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        bd09ToWgs84,
        formatTime,
        getWeatherEmoji,
        saveWeatherQuery,
        getLastWeatherQuery,
        showError,
        hideElement,
        showElement,
        validateApiKeys,
        CONFIG
    };
}