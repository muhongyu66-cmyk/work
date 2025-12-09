
// 全局变量
let map;
let currentWeatherData = null;
let currentCityName = '';
let currentCityId = '';
let currentLocation = null;
let geocoder = null; // 地理编码器

// 初始化地图
function initMap() {
    map = new BMapGL.Map("container");
    const point = new BMapGL.Point(103.9285, 30.5775);
    map.centerAndZoom(point, 12);
    map.enableScrollWheelZoom(true);

    // 添加控件
    map.addControl(new BMapGL.ScaleControl());
    map.addControl(new BMapGL.ZoomControl());

    // 初始化地理编码器
    geocoder = new BMapGL.Geocoder();

    // 添加点击事件监听
    map.addEventListener('click', handleMapClick);

    // 初始化搜索功能
    initSearch();

    // 检查是否有上次查询的记录
    const lastQuery = getLastWeatherQuery();
    if (lastQuery) {
        // 在地图上标记上次查询的位置
        addMarker(lastQuery.lat, lastQuery.lng);
    }
}

// 初始化搜索功能
function initSearch() {
    const searchInput = document.getElementById('citySearch');
    const searchButton = document.getElementById('searchButton');
    const suggestionsContainer = document.getElementById('searchSuggestions');

    // 搜索按钮点击事件
    searchButton.addEventListener('click', handleSearch);

    // 回车键搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 输入时显示搜索建议
    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = this.value.trim();
        
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchSearchSuggestions(query);
        }, 300);
    });

    // 点击其他地方关闭建议列表
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
}

// 处理搜索
function handleSearch() {
    const searchInput = document.getElementById('citySearch');
    const cityName = searchInput.value.trim();
    
    if (!cityName) {
        alert('请输入城市名称');
        return;
    }

    searchByCityName(cityName);
}

// 根据城市名称搜索
async function searchByCityName(cityName) {
    if (!validateApiKeys()) {
        showError('error', '请配置API密钥');
        return;
    }

    showElement('weatherInfo');
    hideElement('weatherContent');
    showElement('loading');
    hideElement('error');
    hideElement('searchSuggestions');

    try {
        // 使用和风天气的API进行城市搜索
        const locationUrl = `https://pc5khvkgqm.re.qweatherapi.com/geo/v2/city/lookup?location=${encodeURIComponent(cityName)}&key=${CONFIG.WEATHER_API_KEY}`;
        const locationResponse = await fetch(locationUrl);
        const locationData = await locationResponse.json();

        if (locationData.code === '200' && locationData.location && locationData.location.length > 0) {
            // 使用第一个匹配的城市
            const city = locationData.location[0];
            currentCityName = city.name;
            currentCityId = city.id;
            
            // 将城市坐标转换为百度坐标
            const convertedLng = parseFloat(city.lon);
            const convertedLat = parseFloat(city.lat);
            
            // 更新位置信息
            currentLocation = {
                lat: convertedLat,
                lng: convertedLng
            };

            // 在地图上定位
            const point = new BMapGL.Point(convertedLng, convertedLat);
            map.centerAndZoom(point, 13);
            
            // 获取天气信息
            await fetchWeather(convertedLat, convertedLng);
        } else {
            // 如果没有找到，尝试使用百度地图地理编码
            searchCityByBaidu(cityName);
        }
    } catch (error) {
        console.error('搜索城市失败:', error);
        searchCityByBaidu(cityName);
    }
}

// 使用百度地图地理编码搜索城市
function searchCityByBaidu(cityName) {
    geocoder.getPoint(cityName, function(point) {
        if (point) {
            // 将百度坐标转换为WGS84坐标
            const converted = bd09ToWgs84(point.lng, point.lat);
            
            currentLocation = {
                lat: parseFloat(converted.lat),
                lng: parseFloat(converted.lng)
            };

            // 在地图上定位
            map.centerAndZoom(point, 13);
            
            // 获取天气信息
            fetchWeatherByCoordinates(parseFloat(converted.lat), parseFloat(converted.lng));
        } else {
            showError('error', `未找到城市: ${cityName}`);
        }
    });
}

// 根据坐标获取天气
async function fetchWeatherByCoordinates(lat, lng) {
    try {
        // 获取位置信息
        const locationUrl = `https://pc5khvkgqm.re.qweatherapi.com/geo/v2/city/lookup?location=${lng},${lat}&key=${CONFIG.WEATHER_API_KEY}`;
        const locationResponse = await fetch(locationUrl);
        const locationData = await locationResponse.json();

        if (locationData.code === '200' && locationData.location.length > 0) {
            currentCityId = locationData.location[0].id;
            currentCityName = locationData.location[0].name;
            
            // 获取实时天气
            await fetchWeather(lat, lng);
        } else {
            showError('error', '无法获取该位置的天气信息');
        }
    } catch (error) {
        console.error('获取天气失败:', error);
        showError('error', '网络请求失败，请检查网络连接');
    }
}

// 获取搜索建议
async function fetchSearchSuggestions(query) {
    try {
        const url = `https://pc5khvkgqm.re.qweatherapi.com/geo/v2/city/lookup?location=${encodeURIComponent(query)}&key=${CONFIG.WEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (data.code === '200' && data.location && data.location.length > 0) {
            suggestionsContainer.innerHTML = '';
            
            // 只显示前10个结果
            data.location.slice(0, 10).forEach(city => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.innerHTML = `
                    <span class="suggestion-name">${city.name}</span>
                    <span class="suggestion-adm">${city.adm2}, ${city.adm1}</span>
                `;
                
                suggestionItem.addEventListener('click', () => {
                    document.getElementById('citySearch').value = city.name;
                    suggestionsContainer.style.display = 'none';
                    searchByCityName(city.name);
                });
                
                suggestionsContainer.appendChild(suggestionItem);
            });
            
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('获取搜索建议失败:', error);
        document.getElementById('searchSuggestions').style.display = 'none';
    }
}

// 处理地图点击事件
async function handleMapClick(e) {
    currentLocation = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };

    showElement('weatherInfo');
    hideElement('weatherContent');
    showElement('loading');
    hideElement('error');

    await fetchWeather(currentLocation.lat, currentLocation.lng);
}

// 获取天气数据
async function fetchWeather(lat, lng) {
    if (!validateApiKeys()) {
        showError('error', '请配置API密钥');
        return;
    }

    try {
        // 转换坐标
        const converted = bd09ToWgs84(lng, lat);

        // 获取位置信息
        const locationUrl = `https://pc5khvkgqm.re.qweatherapi.com/geo/v2/city/lookup?location=${converted.lng},${converted.lat}&key=${CONFIG.WEATHER_API_KEY}`;
        const locationResponse = await fetch(locationUrl);
        const locationData = await locationResponse.json();

        if (locationData.code === '200' && locationData.location.length > 0) {
            currentCityId = locationData.location[0].id;
            currentCityName = locationData.location[0].name;

            // 更新搜索框显示
            document.getElementById('citySearch').value = currentCityName;

            // 获取实时天气
            const weatherUrl = `https://pc5khvkgqm.re.qweatherapi.com/v7/weather/now?location=${currentCityId}&key=${CONFIG.WEATHER_API_KEY}`;
            const weatherResponse = await fetch(weatherUrl);
            const weatherData = await weatherResponse.json();

            if (weatherData.code === '200') {
                currentWeatherData = weatherData.now;
                updateWeatherDisplay();
                addMarker(lat, lng);
                saveWeatherQuery(currentCityName, currentCityId, lat, lng, currentWeatherData);
            } else {
                showError('error', `天气数据错误: ${weatherData.code}`);
            }
        } else {
            showError('error', `位置查询失败: ${locationData.code || '未知错误'}`);
        }
    } catch (error) {
        console.error('获取天气失败:', error);
        showError('error', '网络请求失败，请检查网络连接');
    }
}

// 更新天气显示
function updateWeatherDisplay() {
    hideElement('loading');
    showElement('weatherContent');

    document.getElementById('location').textContent = currentCityName;
    document.getElementById('temp').textContent = `${currentWeatherData.temp}°C`;
    document.getElementById('condition').textContent = currentWeatherData.text;
    document.getElementById('humidity').textContent = `${currentWeatherData.humidity}%`;
    document.getElementById('wind').textContent = `${currentWeatherData.windDir} ${currentWeatherData.windScale}级`;

    // 设置详情页面链接
    const detailLink = document.getElementById('detailLink');
    if (detailLink) {
        detailLink.href = `weather-detail.html?city=${encodeURIComponent(currentCityName)}&id=${currentCityId}&lat=${currentLocation.lat}&lng=${currentLocation.lng}`;
        detailLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = this.href;
        });
    }
}

// 添加地图标记
function addMarker(lat, lng) {
    map.clearOverlays();
    const point = new BMapGL.Point(lng, lat);
    const marker = new BMapGL.Marker(point);
    
    // 添加信息窗口
    const infoWindow = new BMapGL.InfoWindow(
        `<div style="padding:10px;">
            <strong>${currentCityName}</strong><br>
            温度: ${currentWeatherData.temp}°C<br>
            天气: ${currentWeatherData.text}
        </div>`,
        {
            width: 200,
            height: 100
        }
    );
    
    marker.addEventListener('click', function() {
        this.openInfoWindow(infoWindow);
    });
    
    map.addOverlay(marker);
    
    // 打开信息窗口
    setTimeout(() => {
        marker.openInfoWindow(infoWindow);
    }, 500);
}

// 关闭天气信息面板
function closeWeatherInfo() {
    hideElement('weatherInfo');
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // 添加关闭按钮事件
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeWeatherInfo);
    }

    // 检查URL参数，看是否是从详情页返回
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('returnFrom') && urlParams.get('returnFrom') === 'detail') {
        const lastQuery = getLastWeatherQuery();
        if (lastQuery) {
            // 恢复上次查询的位置
            map.centerAndZoom(new BMapGL.Point(lastQuery.lng, lastQuery.lat), 13);
            addMarker(lastQuery.lat, lastQuery.lng);
            showElement('weatherInfo');
            updateWeatherDisplay();
            
            // 更新搜索框
            document.getElementById('citySearch').value = lastQuery.cityName;
        }
    }
});
