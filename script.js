var view, csvLayer, graphicsLayer; // 定义为全局变量

require([
    "esri/views/MapView",
    "esri/WebMap",
    "esri/layers/CSVLayer",
    "esri/renderers/SimpleRenderer",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "dojo/domReady!"
], function (MapView, WebMap, CSVLayer, SimpleRenderer, SimpleMarkerSymbol, BasemapGallery, Expand, Graphic, GraphicsLayer) {

    var markerSymbol = new SimpleMarkerSymbol({
        color: [226, 119, 40],
        outline: { color: [255, 255, 255], width: 2 }
    });

    var renderer = new SimpleRenderer({
        symbol: markerSymbol
    });

    csvLayer = new CSVLayer({
        url: "history spots_0522.csv",
        outFields: ["*"],
        latitudeField: "Latitude",
        longitudeField: "Longitude",
        popupTemplate: {
            title: "{Name}",
            content: [
                {
                    type: "media",
                    mediaInfos: [
                        {
                            title: "",
                            type: "image",
                            value: { sourceURL: "{Image}" }
                        }
                    ]
                },
                {
                    type: "fields",
                    fieldInfos: [
                        { fieldName: "Name", label: "Name" },
                        { fieldName: "Summary", label: "Summary" },
                        { fieldName: "Contact Info", label: "Contact Info" },
                        { fieldName: "Ticket Prices", label: "Ticket Prices" },
                        { fieldName: "Opening Hours", label: "Opening Hours" },
                        { fieldName: "Latitude", label: "Latitude" },
                        { fieldName: "Longitude", label: "Longitude" },
                        { fieldName: "Architectural_style", label: "Architectural Style" },
                        { fieldName: "Era", label: "Era" },
                        { fieldName: "province", label: "Historical Figure" },
                        { fieldName: "Historical_events", label: "Historical Events" },
                        {
                            fieldName: "Link",
                            label: "Link",
                            visible: true,
                            format: { template: "<a href={Link} target='_blank'>連結</a>" }
                        }
                    ]
                }
            ]
        },
        renderer: renderer
    });

    var map = new WebMap({
        basemap: "satellite",
        layers: [csvLayer]
    });

    view = new MapView({
        container: "viewDiv",
        map: map,
        center: [116.383331, 39.916668], // Longitude, latitude
        zoom: 13
    });

    view.when(function () {
        // 初始化下拉选单
        initDropdowns();

        // 绑定搜索按钮事件
        document.getElementById('searchButton').addEventListener('click', function () {
            searchHistoricBuildings();
        });

        // 绑定清除按钮事件
        document.getElementById('clearButton').addEventListener('click', function () {
            clearFilters();
        });

        // 绑定搜索框Enter事件
        document.getElementById('searchBox').addEventListener('keydown', function (event) {
            if (event.key === "Enter" || event.keyCode === 13) { // 兼容不同浏览器
                searchHistoricBuildings();
            }
        });

        // 添加切换底图按钮到地图视图中
        var basemapGallery = new BasemapGallery({
            view: view,
            container: document.createElement("div")
        });

        var basemapGalleryExpand = new Expand({
            view: view,
            content: basemapGallery
        });

        view.ui.add(basemapGalleryExpand, "top-left");

        document.getElementById('toggleSearch').addEventListener('click', function () {
            document.getElementById('searchSection').style.display = 'block';
            document.getElementById('routeSection').style.display = 'none';
            this.classList.add('active');
            document.getElementById('toggleRoute').classList.remove('active');
            resetMapView(); // 重置地图视图
        });

        document.getElementById('toggleRoute').addEventListener('click', function () {
            document.getElementById('searchSection').style.display = 'none';
            document.getElementById('routeSection').style.display = 'block';
            this.classList.add('active');
            document.getElementById('toggleSearch').classList.remove('active');
        });

        // 初始化下拉选单
        function initDropdowns() {
            var architecturalStyles = new Set();
            var eras = new Set();
            var provinces = new Set();

            // 从CSV文件读取province数据
            fetch('onlyprovince.csv')
                .then(response => response.text())
                .then(data => {
                    const lines = data.split('\n');
                    lines.forEach(line => {
                        const fields = line.split(',');
                        provinces.add(fields[0].trim()); // 假设province在第一列
                    });
                    populateDropdown('provinceSelect', provinces, "请选择历史人物");
                })
                .catch(error => console.error('Error loading province data:', error));

            csvLayer.queryFeatures({
                where: "1=1",
                outFields: ["Architectural_style", "Era"]
            }).then(function (results) {
                results.features.forEach(function (feature) {
                    architecturalStyles.add(feature.attributes.Architectural_style);
                    eras.add(feature.attributes.Era);
                });

                populateDropdown('architecturalStyleSelect', architecturalStyles, "请选择建筑风格");
                populateDropdown('eraSelect', eras, "请选择时代");
            });

            document.getElementById('architecturalStyleSelect').addEventListener('change', function () {
                updateDropdowns('architecturalStyleSelect');
            });
            document.getElementById('eraSelect').addEventListener('change', function () {
                updateDropdowns('eraSelect');
            });
            document.getElementById('provinceSelect').addEventListener('change', function () {
                updateDropdowns('provinceSelect');
            });
        }

        function populateDropdown(elementId, valuesSet, placeholder) {
            var selectElement = document.getElementById(elementId);
            selectElement.innerHTML = `<option value="">${placeholder}</option>`; // 重置下拉选单并添加提示文字
            valuesSet.forEach(function (value) {
                var option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectElement.appendChild(option);
            });
        }

        function updateDropdowns(changedElementId) {
            var selectedArchitecturalStyle = document.getElementById('architecturalStyleSelect').value;
            var selectedEra = document.getElementById('eraSelect').value;
            var selectedProvince = document.getElementById('provinceSelect').value;

            var query = csvLayer.createQuery();
            query.where = "1=1";

            if (selectedArchitecturalStyle) {
                query.where += ` AND Architectural_style = '${selectedArchitecturalStyle}'`;
            }
            if (selectedEra) {
                query.where += ` AND Era = '${selectedEra}'`;
            }
            if (selectedProvince) {
                query.where += ` AND province = '${selectedProvince}'`;
            }

            csvLayer.queryFeatures(query).then(function (results) {
                var architecturalStyles = new Set();
                var eras = new Set();
                var provinces = new Set();

                results.features.forEach(function (feature) {
                    architecturalStyles.add(feature.attributes.Architectural_style);
                    eras.add(feature.attributes.Era);
                    provinces.add(feature.attributes.province);
                });

                if (changedElementId !== 'architecturalStyleSelect') {
                    populateDropdown('architecturalStyleSelect', architecturalStyles, "请选择建筑风格");
                    document.getElementById('architecturalStyleSelect').value = selectedArchitecturalStyle;
                }
                if (changedElementId !== 'eraSelect') {
                    populateDropdown('eraSelect', eras, "请选择时代");
                    document.getElementById('eraSelect').value = selectedEra;
                }
                if (changedElementId !== 'provinceSelect') {
                    populateDropdown('provinceSelect', provinces, "请选择历史人物");
                    document.getElementById('provinceSelect').value = selectedProvince;
                }
            });
        }

        function searchHistoricBuildings() {
            var searchValue = document.getElementById('searchBox').value;
            var architecturalStyle = document.getElementById('architecturalStyleSelect').value;
            var era = document.getElementById('eraSelect').value;
            var province = document.getElementById('provinceSelect').value;
            var sortOrder = document.getElementById('sortOrder').value;

            var query = csvLayer.createQuery();
            query.where = "1=1";

            if (searchValue) {
                query.where += ` AND Name LIKE '%${searchValue}%'`;
            }
            if (architecturalStyle) {
                query.where += ` AND Architectural_style = '${architecturalStyle}'`;
            }
            if (era) {
                query.where += ` AND Era = '${era}'`;
            }
            if (province) {
                query.where += ` AND province = '${province}'`;
            }

            csvLayer.queryFeatures(query).then(function (results) {
                let filteredFeatures = results.features;

                if (sortOrder === 'asc') {
                    filteredFeatures.sort((a, b) => historicalEraOrder[a.attributes.Era] - historicalEraOrder[b.attributes.Era]);
                } else {
                    filteredFeatures.sort((a, b) => historicalEraOrder[b.attributes.Era] - historicalEraOrder[a.attributes.Era]);
                }

                if (filteredFeatures.length > 1) {
                    var resultList = document.getElementById('resultsList');
                    resultList.innerHTML = ''; // 清空现有选项

                    filteredFeatures.forEach(function (feature) {
                        var li = document.createElement('li');
                        li.textContent = feature.attributes.Name;
                        li.onclick = function () {
                            displayResult(feature);
                            closeResultsModal();
                        };
                        resultList.appendChild(li);
                    });

                    document.getElementById('resultsModal').style.display = 'block'; // 显示下拉框
                } else if (filteredFeatures.length === 1) {
                    displayResult(filteredFeatures[0]);
                } else {
                    console.log("No results found");
                    view.popup.close();
                }
            }).catch(function (error) {
                console.error("Search failed:", error);
            });
        }

        function displayResult(feature) {
            var geometry = feature.geometry;
            view.goTo({
                target: geometry,
                zoom: 15
            }, {
                duration: 1500,
                easing: "ease-in-out"
            }).then(function () {
                view.popup.open({
                    features: [feature],
                    location: geometry
                });
            });
        }

        function closeResultsModal() {
            var resultsModal = document.getElementById('resultsModal');
            if (resultsModal) {
                resultsModal.style.display = 'none';
                console.log('Modal closed successfully.');
            } else {
                console.log('Error: Modal element not found.');
            }
        }

        function clearFilters() {
            document.getElementById('searchBox').value = '';
            document.getElementById('architecturalStyleSelect').value = '';
            document.getElementById('eraSelect').value = '';
            document.getElementById('provinceSelect').value = '';
            document.getElementById('sortOrder').value = 'asc';
            initDropdowns();
        }

        /* 添加路線圖層 */
        graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        document.getElementById('showRouteButton').addEventListener('click', function () {
            const route = document.getElementById('routeSelect').value;
            if (route) {
                // 根據選擇的路線顯示地圖路徑和資訊
                showRoute(route);
            }
        });

        function showRoute(route) {
            // 清除現有圖形
            graphicsLayer.removeAll();

            // 路線資料
            const routes = {
                "route1": {
                    "details":`北大周边一日游：探索历史与自然之美
                    如果您想在一天之内充分体验北京的历史文化和自然美景，北大周边的一日游将是您的最佳选择。 我们将带您走访三个独具魅力的景点：圆明园、北京大学未名湖和颐和园，让您在一天内收获丰富的文化体验和美丽的风景。

                    首先，我们的旅程将从圆明园开始。 圆明园被誉为「万园之园」，是清代皇帝的离宫和皇家园林的代表作之一。 这里融合了中西方建筑艺术的精华，拥有无数精美的亭台楼阁和湖光山色。 漫步在这片广阔的园林中，您可以感受到昔日皇家生活的奢华与风采，同时也能领略到这座园林在历史上的重要地位。
                    
                    接着，我们将前往北京大学，欣赏未名湖的自然风光。 未名湖位于北大校园内，静谧而美丽，湖畔的树木和古建筑相映成趣，是北大师生们心灵放松的绝佳之地。 在这里，您可以漫步于湖边小道，欣赏美景，并感受北大浓厚的学术氛围。 这段旅程将带给您一种宁静而深邃的文化享受。
                    
                    最后，我们将前往颐和园，这座世界闻名的皇家园林以其壮丽的景色和丰富的历史文化遗产吸引着无数游客。 颐和园是清朝皇室的夏宫，其主要景点包括美丽的昆明湖和壮观的万寿山。 游览颐和园，您可以乘船游湖，漫步于长廊，欣赏精美的宫殿和佛香阁，并俯瞰整个园林的壮丽景色。
                    
                    这三个景点的安排，让您在一天之内既能感受到皇家园林的壮丽与威严，又能体会现代学府的宁静与智慧，并欣赏到北京城的自然美景。 这将是一场丰富而难忘的文化之旅，让您全方位地领略北京的多彩魅力。 立即加入我们，踏上这场精彩的一日游吧！`
                    ,
                    "spots": [
                        { "name": "景點 1", "coordinates": [116.305577, 40.006724] },
                        { "name": "景點 2", "coordinates": [116.274533,39.998] },
                        { "name": "景點 3", "coordinates": [116.3040327, 39.99347134] }
                    ],
                    "color": [237, 250, 0]
                },
                "route2": {
                    "details": `故宫周边一日游：穿越历史与文化的魅力之旅

                    探索北京的核心地区，感受历史的厚重与文化的丰富，故宫周边的一日游将带您走访三个充满历史意义的景点：
                    1、故宫
                    2、北京大学红楼
                    3、景山。
                   
                    首先，我们的旅程将从世界著名的故宫开始。 这座古老的宫殿是明清两代的皇家宫殿，也是世界上最大的古代木构建筑群之一。 故宫内的豪华建筑、精美的文物和壮丽的庭院，无不展示着中国古代皇室的奢华与智慧。 在这里，您可以深入了解中国五千年的历史与文化，感受帝王之家独特的魅力。
                   
                    接着，我们将前往北京大学红楼，这座红色砖楼见证了中国现代史的重要时刻。 红楼是五四运动的策源地之一，见证了新文化运动的风云变幻。 参观红楼，您将了解到那段激昂澎湃的历史，并体会到那个时代的知识分子为国家命运奋斗的热情与理想。
                   
                    最后，我们将登上景山，这座位于故宫北侧的山丘不仅是观赏故宫全景的绝佳位置，也是北京城的制高点之一。 站在景山顶端，您可以一览北京城的壮丽景色，遥想古代皇帝在此俯瞰天下的情景。 景山公园的秀美景致和宁静氛围，将为您的旅程画上完美的句号。
                   
                    这三个景点的安排，让您在一天之内既能感受到皇宫的壮丽与威严，又能领略现代中国的历史变迁，并欣赏北京城的自然美景。 这将是一场丰富多彩的文化之旅，让您全方位地体验北京的历史与魅力。 立即加入我们，踏上这场穿越时空的精彩一日游吧！`
                    ,
                    "spots": [
                        { "name": "景點 4", "coordinates": [116.3896137, 39.92186203] },
                        { "name": "景點 5", "coordinates": [116.3974427, 39.92285634] },
                        { "name": "景點 6", "coordinates": [116.3985817, 39.92502786] }
                    ],
                    "color": [255, 62, 165]
                },
                "route3": {
                    "details": `历史文化名街附近一日游：探索古都文化精粹

                    在北京这座拥有深厚历史底蕴的城市中，历史文化名街周边的一日游将带您领略国子监、京孔庙和雍和宫这三个富有文化意义的景点，让您沉浸在浓厚的古都文化氛围中。
                    
                    首先，我们的旅程将从国子监开始。 国子监是中国古代最高学府，也是元、明、清三代的中央官学所在地。 在这里，您可以感受到昔日学子的求学热情和儒家文化的博大精深。 参观国子监的古老建筑，了解中国古代教育制度的演变，这将是一段充满知识与启迪的旅程。
                    
                    接着，我们将前往京孔庙，这座始建于元代的大型祭孔庙宇，是中国现存规模仅次于曲阜孔庙的儒家祭祀场所。 京孔庙内供奉着孔子及其弟子的牌位，并收藏了大量珍贵的石刻和碑刻。 漫步于这片古朴的庙宇中，您将深刻体会到儒家文化对中国历史与社会的深远影响。
                    
                    最后，我们将参观雍和宫，这座位于北京城北的著名藏传佛教寺庙，以其壮丽的建筑和浓厚的宗教氛围闻名于世。 雍和宫是清朝皇室修行的场所，现如今已成为中外游客争相拜访的圣地。 在这里，您可以观赏到精美的佛像和珍贵的佛教文物，并亲身感受佛教文化的神秘与庄严。
                    
                    这三个景点的安排，让您在一天之内既能了解中国古代教育与儒家文化的博大精深，又能体验佛教文化的独特魅力，并领略古都北京的历史风韵。 这将是一场令人难忘的文化之旅，让您全方位地体验北京的历史文化精粹。 来吧，让我们一起踏上这场精彩的一日游！`
                    ,
                    "spots": [
                        { "name": "景點 7", "coordinates": [116.4069906, 39.94457873] },
                        { "name": "景點 8", "coordinates": [116.4085138, 39.94425952] },
                        { "name": "景點 9", "coordinates": [116.4109106, 39.94623087] }
                    ],
                    "color": [105, 225, 71]
                }
            };

            if (routes[route]) {
                const routeData = routes[route];
                document.getElementById('routeInfo').style.display = 'block';
                document.getElementById('routeDetails').innerText = routeData.details;

                const spotGraphics = routeData.spots.map(function (spot) {
                    const point = {
                        type: "point",
                        longitude: spot.coordinates[0],
                        latitude: spot.coordinates[1]
                    };

                    const pointSymbol = {
                        type: "simple-marker",
                        color: routeData.color,
                        size: "12px",
                        outline: {
                            color: [255, 255, 255],
                            width: 2
                        }
                    };

                    const pointGraphic = new Graphic({
                        geometry: point,
                        symbol: pointSymbol,
                        attributes: { name: spot.name }
                    });

                    graphicsLayer.add(pointGraphic);
                    return pointGraphic;
                });

                // 計算包含所有景點的區域範圍並稍微移動視窗
                const geometries = spotGraphics.map(graphic => graphic.geometry);
                const extent = geometries[0].extent.clone();
                geometries.forEach(function (geometry) {
                    extent.union(geometry.extent);
                });

                view.goTo(extent.expand(1.2), { duration: 1000 });
            }
        }

        // Home button to reset map view
        document.getElementById('homeButton').addEventListener('click', function () {
            view.goTo({
                center: [116.383331, 39.916668],
                zoom: 12
            }, {
                duration: 500,
                easing: "ease-in-out"
            });
        });

        function resetMapView() {
            graphicsLayer.removeAll();
            view.goTo({
                center: [116.383331, 39.916668],
                zoom: 12
            }, {
                duration: 500,
                easing: "ease-in-out"
            });
        }

        // 綁定關閉按鈕事件
        document.querySelector('.close-modal').addEventListener('click', function () {
            closeResultsModal();
        });
    });

    // 定義歷史時代的順序
    const historicalEraOrder = {
        "旧石器时代": 1,
        "新石器时代": 2,
        "西周": 3,
        "隋": 4,
        "辽": 5,
        "金": 6,
        "元": 7,
        "明": 8,
        "清": 9,
        "民国": 10,
        "近代": 11
    };
});
