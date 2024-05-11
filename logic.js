import data from './pointsData.json' assert {type: 'json'};
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {useGeographic} from 'ol/proj';
import {Feature, Overlay} from 'ol';
import {LineString, Point} from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';

import {get} from 'ol/proj.js';

const list = document.getElementsByTagName('ul')[0];
const popupInfo = document.getElementById('popupInfo');
const btnCenter = document.getElementById('btnCenter');
const btnNewPoint = document.getElementById('btnNewPoint');
const btnSavePoint = document.getElementById('btnSavePoint');
const btnRoute = document.getElementById('btnRoute');
const btnLogin = document.getElementById('btnLogin');
const popupLogin = document.getElementById('popupLogin');
const btnSignin = document.getElementById('btnSignin');
const popupSignin = document.getElementById('popupSignin');
const popupSave = document.getElementById('popupSave');
const hintList = document.getElementById('hintList');
const defLat = 54.4;
const defLong = 18.6;
let logged = false;
let email;

class App {
    constructor() {
        this.site = 'http://router.project-osrm.org/route/v1/foot';
        this.apiKey = 'AAPK10d71740470841baaed42884615b1ee18aFFNVd1aKd1B0LoIAGYeNcz4kHplJ-pTki3jwJtXugj8JnUKnI3eDglN0aIV1ij';
        this.authentication = arcgisRest.ApiKeyManager.fromKey(this.apiKey);

        useGeographic();

        this.Init();

        this.points = [];
        this.pointRenders = [];
        this.pointLayer;
        this.startPoint;
        this.endPoint;
        this.startFlag = true;

        this.RenderPoints();

        this.state = 'markers';
    }

    Init() {
        this.view = new View({
            center: [defLong, defLat],
            zoom: 12,
        });

        this.map = new Map({
            target: 'map',
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            view: this.view,
        });
    }

    ChangeState(state) {
        if (this.state === state) return;
        this.state = state;
        if (this.state === 'markers') {
            hintList.classList.add('hidden');
            this.ReloadMap();
            this.LoadPoints();
        }
        if (this.state === 'route') {
            this.ReloadMap();
        }
    }

    ReloadMap() {
        this.startPoint = null;
        this.endPoint = null;

        const old_element = document.getElementById('map');
        const new_element = old_element.cloneNode(true);
        old_element.parentNode.replaceChild(new_element, old_element);
        new_element.firstElementChild.remove();

        this.Init();
        this.RenderPoints();
    }

    SetButtonsListeners() {
        btnCenter.addEventListener('click', () => {
            this.CenterView();
        });

        popupLogin.addEventListener('keypress', async e => {
            if (e.key == 'Enter') {
                e.preventDefault();
                let data = new FormData(popupLogin);
                let response = await fetch('http://localhost:8080/login', {
                    method: 'POST',
                    body: data,
                });
                let result = await response.json();

                alert(result.message);

                if (result.status === '1') {
                    btnLogin.classList.add('hidden');
                    btnSignin.classList.add('hidden');
                    popupLogin.classList.add('hidden');
                    popupSignin.classList.add('hidden');

                    email = data.get('email');
                    logged = true;
                    console.log(logged);
                    this.ReloadMap();
                }
            }
        });

        popupSignin.addEventListener('keypress', async e => {
            if (e.key == 'Enter') {
                e.preventDefault();
                let data = new FormData(popupSignin);
                let response = await fetch('http://localhost:8080/signin', {
                    method: 'POST',
                    body: data,
                });
            }
        });

        btnNewPoint.addEventListener('click', () => {
            this.ChangeState('markers');
            this.AddNewPoint();
        });

        btnSavePoint.addEventListener('click', e => {
            e.preventDefault();
            this.SaveNewPoint();
        });

        btnRoute.addEventListener('click', () => {
            this.ChangeState('route');
            this.StartRoute();
        });

        btnLogin.addEventListener('click', e => {
            e.preventDefault();
            this.OnLoginClick();
        });

        btnSignin.addEventListener('click', e => {
            e.preventDefault();
            this.OnSigninClick();
        });
    }

    SetMapListeners() {
        this.map.on('click', event => {
            const feature = this.map.forEachFeatureAtPixel(event.pixel, feature => {
                return feature;
            });
            if (!feature) {
                popupInfo.classList.add('hidden');
                popupSave.classList.add('hidden');
                return;
            } else {
                let point = this.points.filter(obj => {
                    return obj.name === feature.getProperties()['name'];
                });

                point = point[0];

                this.ShowPointInfo(point);
                this.SetViewToPoint(point);
            }
        });

        this.map.on('dblclick', event => {
            this.AddNewPoint(event);
        });
    }

    async LoadDefaultPoints() {
        this.points = [];
        let response = await fetch('http://localhost:8080/monuments');
        let result = await response.json();

        const points = [...result];

        points.forEach(point => {
            point.default = true;
        });
        this.points.push(...points);
    }

    async LoadSavedPoints() {
        if (localStorage.length !== 0) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const point = JSON.parse(localStorage.getItem(localStorage.key(i)));
                point.default = false;
                point.key = key;
                this.points.push(point);
            }
        }

        if (logged) {
            let response = await fetch(`http://localhost:8080/customMonuments?userEmail=${email}`);
            let result = await response.json();
            result.forEach(point => {
                point.default = false;
                point.id = this.points.push(point);
            });
        }
    }

    async LoadPoints() {
        this.points = [];
        await this.LoadDefaultPoints();
        await this.LoadSavedPoints();
    }

    RenderPointsToMap(points = this.points) {
        this.map.removeLayer(this.map.getLayers().array_[1]);
        this.pointRenders = [];
        points.forEach(point => {
            let pointRender = new Feature({
                geometry: new Point([point.longitude, point.latitude]),
                name: point.name,
            });

            let imageSrc = 'data/img1.png';

            if (point.type == '1') imageSrc = 'data/img1.png';
            if (point.type == '2') imageSrc = 'data/img2.png';
            if (point.type == '3') imageSrc = 'data/img3.png';
            if (point.type == '4') imageSrc = 'data/img4.png';
            if (point.type == '5') imageSrc = 'data/img5.png';

            pointRender.setStyle(
                new Style({
                    image: new Icon({
                        scale: 0.7,
                        anchor: [0.5, 1],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        src: imageSrc,
                    }),
                })
            );

            this.pointRenders.push(pointRender);
        });

        this.vectorSource = new VectorSource({
            features: this.pointRenders,
        });

        this.vectorLayer = new VectorLayer({
            source: this.vectorSource,
        });

        this.map.addLayer(this.vectorLayer);
    }

    RenderPointToList() {
        list.innerHTML = '';
        this.points.forEach((point, i) => {
            let liHTML;
            if (point.default) {
                liHTML = `<li class="border-b-2 border-black 80 flex items-center cursor-pointer">
                <div class="w-full flex items-center p-1">
                <div class="w-8 h-8">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="w-8 h-8 min-w-[32 rem]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                </div>
                <h3 class="text-xl">${point.name}</h3>
                </div>
            </li>`;
            } else {
                liHTML = `<li storage-key="${point.key}" custom_monument_id="${point.custom_monument_id}" class="border-b-2 border-black 80 flex items-center cursor-pointer">
                <div class="w-full flex items-center p-1">
                <div class="w-8 h-8">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="w-8 h-8 min-w-[32 rem]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                </div>
                <h3 class="text-xl">${point.name}</h3>
                <button id="btnDelete" class="w-8 h-8 ml-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                </button>
                </div>
            </li>`;
            }

            list.insertAdjacentHTML('beforeend', liHTML);

            const newLiEl = list.lastElementChild;

            newLiEl.addEventListener('click', () => {
                this.ShowPointInfo(point);
                this.SetViewToPoint(point);
            });

            if (newLiEl.getElementsByTagName('button')[0] !== undefined) {
                newLiEl.getElementsByTagName('button')[0].addEventListener('click', e => {
                    e.stopPropagation();
                    this.DeleteCustomPoint(newLiEl.getAttribute('storage-key'), newLiEl.getAttribute('custom_monument_id'));
                });
            }
        });
    }

    async RenderPoints() {
        await this.LoadPoints();
        this.RenderPointToList();
        this.RenderPointsToMap();
        this.SetButtonsListeners();
        this.SetMapListeners();
    }

    SetViewToPoint(point) {
        const newLatitude = point.latitude - -0.0013;
        const newLongitude = point.longitude - 0.001;
        const cords = [newLongitude, newLatitude];

        this.view.setCenter(cords);
        this.view.setZoom(18);
    }

    ShowPointInfo(point) {
        const x = this.map.getOverlays().getArray()[0];
        if (x !== undefined) this.map.removeOverlay(x);

        this.map.removeOverlay(0);
        const overlay = new Overlay({
            element: popupInfo,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
            positioning: 'bottom-center',
            offset: [0, -60],
        });

        this.map.addOverlay(overlay);

        overlay.setPosition([point.longitude, point.latitude]);

        fetch(`https://geocode.maps.co/reverse?lat=${point.latitude}&lon=${point.longitude}&api_key=66211bd01661f438108894hso5c164e`)
            .then(response => response.json())
            .then(data => {
                popupInfo.getElementsByTagName('img')[0].src = point.photo;
                popupInfo.getElementsByTagName('h4')[0].innerHTML = point.name;
                popupInfo.getElementsByTagName('p')[2].innerHTML = point.description;

                if (data.address.house_number !== undefined) {
                    popupInfo.getElementsByTagName(
                        'p'
                    )[1].innerHTML = `ul. ${data.address.road} ${data.address.house_number}, ${data.address.city} ${data.address.postcode}`;
                } else {
                    popupInfo.getElementsByTagName('p')[1].innerHTML = `ul. ${data.address.road}, ${data.address.city} ${data.address.postcode}`;
                }
            });
        popupInfo.classList.remove('hidden');
    }

    CenterView() {
        navigator.geolocation.getCurrentPosition(
            position => {
                this.view.setCenter([position.coords.longitude, position.coords.latitude]);
                this.view.setZoom(18);
            },
            () => {
                this.view.setCenter([defLong, defLat]);
            }
        );
    }

    AddNewPoint(event = null) {
        document.getElementById('long').value = '';
        document.getElementById('lat').value = '';
        document.getElementById('name').value = '';
        document.getElementById('description').value = '';
        const addPointOverlay = new Overlay({
            element: popupSave,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
            positioning: 'bottom-center',
        });

        this.map.addOverlay(addPointOverlay);

        if (event !== null) {
            addPointOverlay.setPosition(event.coordinate);
            document.getElementById('long').value = Math.round(Number(event.coordinate[0]) * 100) / 100;
            document.getElementById('lat').value = Math.round(event.coordinate[1] * 100) / 100;
        } else {
            addPointOverlay.setPosition(this.view.getCenter());
        }
        popupSave.classList.remove('hidden');
    }

    SaveNewPoint() {
        const name = document.getElementById('name').value;
        const description = document.getElementById('description').value;
        const longitude = document.getElementById('long').value;
        const latitude = document.getElementById('lat').value;
        const photo = document.getElementById('photo').value;

        if (name === '' || description === '' || longitude === '' || latitude === '') {
            btnSavePoint.classList.remove('bg-gray-50');
            btnSavePoint.classList.add('bg-red-800');
            btnSavePoint.disabled = true;
            setTimeout(() => {
                btnSavePoint.disabled = false;
                btnSavePoint.classList.add('bg-gray-50');
                btnSavePoint.classList.remove('bg-red-800');
            }, 2000);
        } else {
            const newPoint = {
                name: name,
                longitude: longitude,
                latitude: latitude,
                description: description,
                photo: photo,
                default: false,
                key: `point${localStorage.length}`,
            };
            this.points.push(newPoint);
            if (logged) {
                var data = {
                    name: name,
                    longitude: longitude,
                    latitude: latitude,
                    description: description,
                    photo: photo,
                    type: 4,
                    email: email,
                };
                console.log(data);
                fetch('http://localhost:8080/customMonuments', {
                    method: 'POST',
                    body: JSON.stringify(data),
                }).then(() => {
                    popupSave.classList.add('hidden');
                    this.RenderPoints();
                });
            } else {
                localStorage.setItem(`point${localStorage.length}`, JSON.stringify(newPoint));
                popupSave.classList.add('hidden');
                this.RenderPoints();
            }
        }
    }

    DeleteCustomPoint(pointKey, custom_monument_id) {
        if (logged) {
            fetch(`http://localhost:8080/deleteCustomMonuments?custom_monument_id=${custom_monument_id}`, {method: 'GET'}).then(() => {
                this.RenderPoints();
            });
        } else {
            localStorage.removeItem(pointKey);
            this.LoadPoints();
            this.RenderPoints();
        }
    }

    GenerateURL(startPoint, endPoint) {
        return `${this.site}/${startPoint};${endPoint}?geometries=geojson&overview=false&steps=true`;
    }

    StartRoute() {
        this.map.on('click', e => {
            e.preventDefault();
            if (this.startPoint === null) {
                this.startPoint = new Point(e.coordinate);
            } else if (this.endPoint === null) {
                this.endPoint = new Point(e.coordinate);

                this.UpdateRoute();
            } else if (this.startPoint !== null && this.endPoint !== null) {
                if (this.startFlag) {
                    this.startPoint = new Point(e.coordinate);
                } else {
                    this.endPoint = new Point(e.coordinate);
                }
                this.startFlag = !this.startFlag;

                this.UpdateRoute();
            }

            this.RenderPointsToMap([
                {name: 'Start point', longitude: this.startPoint.getFlatCoordinates()[0], latitude: this.startPoint.getFlatCoordinates()[1], type: '4'},
                {name: 'End point', longitude: this.endPoint.getFlatCoordinates()[0], latitude: this.endPoint.getFlatCoordinates()[1], type: '5'},
            ]);
        });
    }

    Translate(type, direction) {
        let ans = '';
        if (direction === 'uturn') return 'Zawróć';
        if (type === 'depart') return 'Początek trasy';
        if (type === 'turn') ans += 'Skręć';
        if (type === 'end of road') ans += 'Skręć';
        if (type === 'rotary') ans += 'Na rondzie';
        if (type === 'continue') return 'Jedź prosto';
        if (direction === 'straight') return 'Jedź prosto';
        if (type === 'arrive') {
            return 'Jesteś u celu';
        } else if (ans === '') {
            ans += 'Skręć';
        }
        if (direction === 'right') ans += ' w prawo';
        if (direction === 'left') ans += ' w lewo';
        if (direction === 'slight right') ans += ' lekko w prawo';
        if (direction === 'slight right') ans += ' lekko w prawo';
        if (direction === 'sharp left') ans += ' ostro w lewo';
        if (direction === 'sharp left') ans += ' ostro w lewo';

        return ans;
    }

    async UpdateRoute() {
        const layerAmount = this.map.getAllLayers().length;
        if (layerAmount > 1) {
            this.map.removeLayer(this.map.getAllLayers()[layerAmount - 1]);
        }
        const promise = await fetch(this.GenerateURL(this.startPoint.getCoordinates(), this.endPoint.getCoordinates()));
        const data = await promise.json();
        const route = data.routes[0];
        const hints = [];
        route.legs[0].steps.forEach(step => {
            hints.push(`${this.Translate(step.maneuver.type, step.maneuver.modifier)}`);
        });
        // create polyline from all steps in route
        const steps = route.legs[0].steps;
        const coords = [];
        steps.forEach(step => {
            coords.push(...step.geometry.coordinates);
        });

        hintList.innerHTML = '';
        hintList.classList.remove('hidden');

        hints.forEach((hint, i) => {
            hintList.insertAdjacentHTML('beforeend', `<p>${i}. ${hint}</p>`);
        });
        console.log(hints);

        // Create a vector source
        const source = new VectorSource();

        // Function to create a line string feature from coordinates
        const createLineStringFeature = function (coordinates) {
            return new Feature(new LineString(coordinates));
        };

        // Add the route as a line string feature to the vector source
        source.addFeature(createLineStringFeature(coords));

        // Style for the route
        const style = new Style({
            stroke: new Stroke({
                color: 'red',
                width: 5,
            }),
        });

        // Create a vector layer with the vector source and style
        const vector = new VectorLayer({
            source: source,
            style: style,
        });

        // Add the vector layer to the map
        this.map.addLayer(vector);

        // Limit multi-world panning to one world east and west of the real world.
        // Geometry coordinates have to be within that range.
        const extent = get('EPSG:3857').getExtent().slice();
        extent[0] += extent[0];
        extent[2] += extent[2];
    }

    OnLoginClick() {
        popupLogin.classList.toggle('hidden');
    }
    OnSigninClick() {
        popupSignin.classList.toggle('hidden');
    }
}

const app = new App();
